import { stripe, selectRows, updateRows, slackHook, sendEmail, env } from './_lib.js';

const fmtUsd = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Posts one message to Slack (#vcboom-sales) for every sale, right after the buyer gets their lists.
// Needs SLACK_WEBHOOK_URL (a Slack "Incoming Webhook" URL).
// If Slack fails (missing, revoked or down), the same alert is emailed to ALERT_EMAIL so a sale is never silent,
// and the row stays unmarked so catchUpSales() posts it to Slack once the webhook works again.
// Never throws: a Slack hiccup must not affect delivery.

// One Slack post. Returns { ok, status, body }.
export async function postSlack(text) {
  const hook = slackHook();
  if (!hook) return { ok: false, status: 'SLACK_WEBHOOK_URL not set', body: '' };
  try {
    const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    return { ok: r.ok, status: r.status, body: r.ok ? '' : (await r.text()).slice(0, 80) };
  } catch (e) {
    return { ok: false, status: 'network', body: String(e.message || e).slice(0, 80) };
  }
}

// Fallback when Slack fails: email the alert so nobody misses a sale.
export async function alertByEmail(subject, text, why) {
  try {
    const body = `${text.replace(/[*_]/g, '').replace(/:[a-z_]+: /g, '')}\n\n---\nThe Slack alert failed (${why}). This sale will be posted to #vcboom-sales automatically once Slack works again.\nFix: Slack app "Sales alerts" > Incoming Webhooks > copy the #vcboom-sales URL > Vercel ci-lists > SLACK_WEBHOOK_URL > save > redeploy.`;
    await sendEmail({ to: env('ALERT_EMAIL', 'yoann@climateinsiders.com'), subject, text: body, tags: [{ name: 'type', value: 'sale_alert' }] });
  } catch (e) {
    console.warn('alert email failed', String(e.message || e).slice(0, 200));
  }
}

const listName = (slugs, bundle, upsell, upgrade) =>
  upsell ? 'All-investors upgrade (thanks-page offer)'
    : bundle ? (upgrade ? 'All 10 lists (upgrade from a single list)' : 'All 10 lists')
      : (slugs || []).map((s) => NAMES[s] || s).join(', ');

// Posts every paid sale from the last 7 days that never reached Slack. Safe to call often.
export async function catchUpSales() {
  if (!slackHook()) return { posted: 0, pending: null };
  const since = new Date(Date.now() - 7 * 86400e3).toISOString();
  const rows = await selectRows('list_purchases', `amount_cents=gt.0&slack_notified_at=is.null&created_at=gte.${since}&select=id,created_at,amount_cents,net_cents,slugs,bundle,first_name,attribution&order=created_at.asc`);
  let posted = 0;
  for (const r of rows) {
    const when = new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const a = r.attribution || {};
    const text = [
      `:moneybag: *Sale: ${fmtUsd(r.amount_cents)}*${r.net_cents != null ? `  (net ${fmtUsd(r.net_cents)})` : ''}  _(${when}, delayed alert)_`,
      `*What:* ${listName(r.slugs, r.bundle, a.upsell, a.upgrade_from)}`,
      `*Buyer:* ${r.first_name || 'no name'}${a.country ? ` · ${a.country}` : ''}`,
      `*Source:* ${[a.utm_source, a.utm_campaign].filter(Boolean).join(' / ') || 'direct'}`,
    ].join('\n');
    const p = await postSlack(text);
    if (!p.ok) break;
    await updateRows('list_purchases', `id=eq.${r.id}`, { slack_notified_at: new Date().toISOString() });
    posted++;
  }
  return { posted, pending: rows.length - posted };
}

const NAMES = {
  'europe-500': 'Europe',
  'usa-500': 'United States',
  'uk-200': 'United Kingdom',
  'dach-150': 'DACH',
  'nordics-150': 'Nordics',
  'france-benelux-150': 'France + Benelux',
  'apac-200': 'Asia-Pacific',
  'latam-canada-150': 'Canada + LatAm',
  'lps-366': 'LPs',
  'climate-vcs-474': 'Climate VCs',
};

async function feeFor(paymentIntent, amount) {
  if (paymentIntent) {
    try {
      const p = await stripe(`payment_intents/${paymentIntent}?expand[]=latest_charge.balance_transaction`);
      const bt = p.latest_charge?.balance_transaction;
      if (bt && typeof bt === 'object' && Number.isFinite(bt.fee)) return { fee: bt.fee, estimated: false };
    } catch (e) {
      console.warn('slack fee lookup failed', String(e.message).slice(0, 120));
    }
  }
  return { fee: Math.round(amount * 0.029 + 30), estimated: true };
}

export async function notifySale({ rowId, sessionId, paymentIntent, amountCents, email, firstName, slugs, bundle, upsell, upgrade, attribution }) {
  try {
    const amount = amountCents || 0;
    const { fee, estimated } = amount > 0 ? await feeFor(paymentIntent, amount) : { fee: 0, estimated: false };
    const net = amount - fee;
    if (rowId && amount > 0) await updateRows('list_purchases', `id=eq.${rowId}`, { fee_cents: fee, net_cents: net, fee_estimated: estimated });

    const what = upsell
      ? 'All-investors upgrade (thanks-page offer)'
      : bundle
        ? upgrade ? 'All 10 lists (upgrade from a single list)' : 'All 10 lists'
        : slugs.map((s) => NAMES[s] || s).join(', ');

    // Totals across every paid sale, today (Lisbon) and to date.
    const rows = await selectRows('list_purchases', 'amount_cents=gt.0&select=created_at,amount_cents,net_cents');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });
    const netOf = (r) => (r.net_cents ?? Math.round(r.amount_cents - (r.amount_cents * 0.029 + 30)));
    const todays = rows.filter((r) => new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' }) === today);
    const sum = (a) => a.reduce((t, r) => t + netOf(r), 0);

    const src = [attribution?.utm_source, attribution?.utm_campaign].filter(Boolean).join(' / ') || 'direct';
    const lines = [
      amount > 0 ? `:moneybag: *New sale: ${fmtUsd(amount)}*  (net ${fmtUsd(net)} after Stripe fees${estimated ? ', estimated' : ''})` : ':test_tube: *Test order, $0* (100% coupon)',
      `*What:* ${what}`,
      `*Buyer:* ${firstName || 'no name'} · ${email}${attribution?.country ? ` · ${attribution.country}` : ''}`,
      `*Source:* ${src}`,
      `*Today:* ${todays.length} sale${todays.length === 1 ? '' : 's'}, ${fmtUsd(sum(todays))} net  ·  *To date:* ${rows.length} sale${rows.length === 1 ? '' : 's'}, ${fmtUsd(sum(rows))} net`,
    ];
    const text = lines.join('\n');
    const p = await postSlack(text);
    if (p.ok) {
      // Marked so catchUpSales() doesn't post this sale again.
      if (rowId) await updateRows('list_purchases', `id=eq.${rowId}`, { slack_notified_at: new Date().toISOString() });
      await catchUpSales().catch(() => {});
    } else {
      console.warn('slack post failed', p.status, p.body, sessionId);
      if (amount > 0) await alertByEmail(`New sale ${fmtUsd(amount)}: ${what} (Slack alert failed)`, text, `${p.status} ${p.body}`.trim());
    }
  } catch (e) {
    console.warn('slack notify failed', String(e.message || e).slice(0, 200));
  }
}
