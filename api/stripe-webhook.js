import crypto from 'node:crypto';
import { env, readRaw, json, insertRow, updateRows, selectRows } from './_lib.js';
import { deliverPurchase } from './_deliver.js';

export const config = { api: { bodyParser: false } };

function verify(raw, header, secret) {
  // Stripe-Signature: t=...,v1=...
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const ok = parts.v1 && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 600;
  return ok && fresh;
}

// POST /api/stripe-webhook   event: checkout.session.completed
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const raw = await readRaw(req);
  const sig = req.headers['stripe-signature'];
  if (!sig || !verify(raw, sig, env('STRIPE_WEBHOOK_SECRET'))) return json(res, 400, { error: 'Bad signature' });

  const event = JSON.parse(raw);
  if (event.type !== 'checkout.session.completed') return json(res, 200, { ignored: event.type });

  const s = event.data.object;
  if (s.payment_status !== 'paid') return json(res, 200, { ignored: 'unpaid' });

  const email = s.customer_details?.email || s.customer_email;
  const slugs = (s.metadata?.slugs || '').split(',').filter(Boolean);
  const bundle = s.metadata?.bundle === '1';
  if (!email || !slugs.length) return json(res, 200, { ignored: 'no email or slugs' });

  // Idempotent: a retried webhook must not send the list twice.
  const existing = await selectRows('list_purchases', `stripe_session_id=eq.${encodeURIComponent(s.id)}&select=id,delivered_at`);
  if (existing.length && existing[0].delivered_at) return json(res, 200, { ok: true, already: true });
  if (!existing.length) {
    await insertRow('list_purchases', {
      stripe_session_id: s.id,
      stripe_payment_intent: s.payment_intent || null,
      email,
      slugs,
      bundle,
      amount_cents: s.amount_total,
      currency: s.currency,
      attribution: {
        utm_source: s.metadata?.utm_source || null,
        utm_campaign: s.metadata?.utm_campaign || null,
        utm_content: s.metadata?.utm_content || null,
        ref: s.metadata?.ref || null,
        country: s.customer_details?.address?.country || null,
      },
    });
  }

  try {
    await deliverPurchase({ email, slugs, bundle, amountCents: s.amount_total });
    await updateRows('list_purchases', `stripe_session_id=eq.${encodeURIComponent(s.id)}`, { delivered_at: new Date().toISOString(), delivery_error: null });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    await updateRows('list_purchases', `stripe_session_id=eq.${encodeURIComponent(s.id)}`, { delivery_error: String(err.message || err).slice(0, 500) });
    // 500 makes Stripe retry, which re-runs delivery.
    return json(res, 500, { error: 'delivery failed, will retry' });
  }
}
