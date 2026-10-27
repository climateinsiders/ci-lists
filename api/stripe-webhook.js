import crypto from 'node:crypto';
import { env, readRaw, json, insertRow, updateRows, selectRows } from './_lib.js';
import { deliverPurchase } from './_deliver.js';

export const config = { api: { bodyParser: false } };

function verify(raw, header, secret) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Math.abs(Date.now() / 1000 - Number(parts.t)) < 600;
}

// POST /api/stripe-webhook   event: checkout.session.completed (VC Boom Stripe account)
// Records the purchase, emails the lists (E0), and starts the follow-up sequence.
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const raw = await readRaw(req);
  const sig = req.headers['stripe-signature'];
  if (!sig || !verify(raw, sig, env('STRIPE_WEBHOOK_SECRET'))) return json(res, 400, { error: 'Bad signature' });

  const event = JSON.parse(raw);
  if (event.type !== 'checkout.session.completed') return json(res, 200, { ignored: event.type });

  const s = event.data.object;
  // The VC Boom Stripe account also sells other things. Only handle our sessions.
  if (s.metadata?.product !== 'investor-lists') return json(res, 200, { ignored: 'other product' });
  // 'no_payment_required' = a 100% coupon (used for testing). Still deliver.
  if (!['paid', 'no_payment_required'].includes(s.payment_status)) return json(res, 200, { ignored: 'unpaid' });

  const email = (s.customer_details?.email || s.customer_email || '').trim();
  const rawName = s.custom_fields?.find((f) => f.key === 'first_name')?.text?.value || (s.customer_details?.name || '').split(' ')[0] || '';
  const firstName = rawName.trim().split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase()).slice(0, 40) || null;
  const slugs = (s.metadata?.slugs || '').split(',').filter(Boolean);
  const bundle = s.metadata?.bundle === '1';
  const upgrade = Boolean(s.metadata?.upgrade);
  if (!email || !slugs.length) return json(res, 200, { ignored: 'no email or slugs' });

  // Idempotent: a retried webhook must not send the lists twice.
  const sid = encodeURIComponent(s.id);
  let [row] = await selectRows('list_purchases', `stripe_session_id=eq.${sid}&select=id,token,delivered_at`);
  if (row && row.delivered_at) return json(res, 200, { ok: true, already: true });
  if (!row) {
    [row] = await insertRow(
      'list_purchases',
      {
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent || null,
        email,
        first_name: firstName,
        slugs,
        bundle,
        amount_cents: s.amount_total || 0,
        currency: s.currency,
        attribution: {
          utm_source: s.metadata?.utm_source || null,
          utm_campaign: s.metadata?.utm_campaign || null,
          utm_content: s.metadata?.utm_content || null,
          ref: s.metadata?.ref || null,
          upgrade_from: s.metadata?.upgrade || null,
          country: s.customer_details?.address?.country || null,
        },
      },
      { returning: true },
    );
  }

  try {
    await deliverPurchase({ email, slugs, bundle, upgrade, token: row.token, amountCents: s.amount_total, name: firstName, sessionId: s.id, upsell: s.metadata?.upsell === '1' });
    const now = new Date().toISOString();
    // Only the newest purchase per email runs the sequence, so nobody gets two copies.
    await updateRows('list_purchases', `email=ilike.${encodeURIComponent(email)}&id=neq.${row.id}`, { followup_step: 99 });
    await updateRows('list_purchases', `id=eq.${row.id}`, { delivered_at: now, delivery_error: null, followup_step: 1, last_email_at: now });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    await updateRows('list_purchases', `id=eq.${row.id}`, { delivery_error: String(err.message || err).slice(0, 500) });
    return json(res, 500, { error: 'delivery failed, Stripe will retry' });
  }
}
