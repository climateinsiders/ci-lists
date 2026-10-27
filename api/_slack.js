import { stripe, selectRows, updateRows } from './_lib.js';

const fmtUsd = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Posts one message to Slack (#vcboom) for every sale, right after the buyer gets their lists.
// Needs SLACK_WEBHOOK_URL (a Slack "Incoming Webhook" URL). Without it, this does nothing.
// Never throws: a Slack hiccup must not affect delivery.

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
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return;
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
    const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lines.join('\n') }) });
    if (!r.ok) console.warn('slack post failed', r.status, sessionId);
  } catch (e) {
    console.warn('slack notify failed', String(e.message || e).slice(0, 200));
  }
}
