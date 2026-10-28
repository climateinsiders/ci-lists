import { selectRows, insertRow, updateRows, stripe, json, env } from './_lib.js';
import { lisbonDay } from './_dash-metrics.js';

// GET /api/ops-report?key=<ops_tokens.token>[&peek=1]
// Sales since the last report and to date, net of Stripe fees. Used by the 4-hourly Slack update.
// Only paid investor-list purchases (list_purchases with amount > 0) are counted.
// Fees come from the Stripe balance transaction. If the restricted key can't read it, the fee is
// estimated (2.9% + 30c, +1.5% for non-US cards is not knowable here) and flagged as estimated.
const fmt$ = (c) => '$' + Math.round((c || 0) / 100).toLocaleString('en-US');
const pctOf = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : 'n/a');

// Daily scorecard for #vcboom-sales: comments, DMs sent, visits, buyers and the rough CVR, for one Lisbon day.
export async function dailyReport(day = lisbonDay(Date.now())) {
  const since = new Date(Date.parse(`${day}T00:00:00Z`) - 2 * 3600e3).toISOString(); // Lisbon is UTC+0/+1
  const [events, visits, buys] = await Promise.all([
    selectRows('funnel_events', `occurred_at=gte.${since}&select=event_type,occurred_at,person_name&limit=20000`),
    selectRows('page_visits', `day=eq.${day}&select=source,campaign,visits`),
    selectRows('list_purchases', `amount_cents=gt.0&created_at=gte.${since}&select=amount_cents,bundle,created_at`),
  ]);
  const ev = events.filter((e) => lisbonDay(e.occurred_at) === day);
  const comments = ev.filter((e) => e.event_type === 'comment').length;
  const dmRequests = ev.filter((e) => e.event_type === 'dm').length;
  const dmsSent = ev.filter((e) => e.event_type === 'dm_sent').length;
  const visitsN = visits.reduce((t, v) => t + (v.visits || 0), 0);
  const linkedinVisits = visits.filter((v) => v.source === 'linkedin').reduce((t, v) => t + (v.visits || 0), 0);
  const b = buys.filter((p) => lisbonDay(p.created_at) === day && p.amount_cents >= 1000);
  const gross = b.reduce((t, p) => t + p.amount_cents, 0);
  const bundles = b.filter((p) => p.bundle).length;
  const out = { day, comments, dm_requests: dmRequests, dms_sent: dmsSent, visits: visitsN, linkedin_visits: linkedinVisits, buyers: b.length, bundles, gross_cents: gross };
  const label = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const text = [
    `:bar_chart: *Investor Lists, daily scorecard (${label})*`,
    `• Keyword comments on our list posts: *${comments}*${dmRequests ? `  (+ ${dmRequests} DM requests)` : ''}`,
    `• DMs sent with the list links: *${dmsSent}*`,
    `• Landing page visits: *${visitsN}*  (${linkedinVisits} from LinkedIn)`,
    `• Buyers: *${b.length}*${bundles ? ` (${bundles} full set)` : ''}, ${fmt$(gross)} gross`,
    `• CVR: visit to sale *${pctOf(b.length, visitsN)}*, DM to sale ${pctOf(b.length, dmsSent)}, comment to sale ${pctOf(b.length, comments + dmRequests)}`,
  ].join('\n');
  return { out, text };
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    // Vercel cron (Authorization: Bearer CRON_SECRET) or ?daily=1&key=...: post the daily scorecard to Slack.
    if (url.searchParams.get('daily') === '1' || (req.headers.authorization || '') === `Bearer ${env('CRON_SECRET', '')}`) {
      const authed = (req.headers.authorization || '') === `Bearer ${env('CRON_SECRET', '')}`;
      if (!authed) {
        const k = String(url.searchParams.get('key') || '');
        const [t] = /^[a-f0-9]{32,64}$/.test(k) ? await selectRows('ops_tokens', `token=eq.${k}&purpose=eq.sales_report&select=token`) : [];
        if (!t) return json(res, 403, { error: 'no' });
      }
      const day = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('day') || '') ? url.searchParams.get('day') : undefined;
      const { out, text } = await dailyReport(day);
      let slack = 'not sent';
      if (url.searchParams.get('peek') !== '1' && process.env.SLACK_WEBHOOK_URL) {
        const r = await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        slack = r.ok ? 'sent' : `failed ${r.status}`;
      }
      return json(res, 200, { ...out, slack });
    }
    const key = String(url.searchParams.get('key') || '');
    if (!/^[a-f0-9]{32,64}$/.test(key)) return json(res, 403, { error: 'no' });
    const [tok] = await selectRows('ops_tokens', `token=eq.${key}&purpose=eq.sales_report&select=token`);
    if (!tok) return json(res, 403, { error: 'no' });
    res.setHeader('Cache-Control', 'no-store');
    // ?slack_test=1 sends one test message to the real-time sale channel (checks SLACK_WEBHOOK_URL).
    if (url.searchParams.get('slack_test') === '1') {
      const hook = process.env.SLACK_WEBHOOK_URL;
      if (!hook) return json(res, 200, { slack: 'SLACK_WEBHOOK_URL not set' });
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: ':white_check_mark: Sale alerts are connected. Every investor-list sale will post here the moment Stripe confirms it.' }) });
      return json(res, 200, { slack: r.ok ? 'sent' : `failed ${r.status}` });
    }

    const rows = await selectRows(
      'list_purchases',
      'amount_cents=gt.0&select=id,created_at,amount_cents,stripe_session_id,stripe_payment_intent,fee_cents,net_cents,fee_estimated,slugs,bundle&order=created_at.asc',
    );

    // Fill in fees we don't have yet.
    for (const r of rows) {
      if (r.net_cents !== null && r.fee_cents !== null && !r.fee_estimated) continue;
      let fee = null;
      try {
        const pi = r.stripe_payment_intent || (await stripe(`checkout/sessions/${r.stripe_session_id}`)).payment_intent;
        if (pi) {
          const p = await stripe(`payment_intents/${pi}?expand[]=latest_charge.balance_transaction`);
          const bt = p.latest_charge?.balance_transaction;
          if (bt && typeof bt === 'object') fee = bt.fee;
        }
      } catch (e) {
        console.warn('fee lookup failed', r.stripe_session_id, String(e.message).slice(0, 120));
      }
      const estimated = fee === null;
      if (estimated) fee = Math.round(r.amount_cents * 0.029 + 30);
      r.fee_cents = fee;
      r.net_cents = r.amount_cents - fee;
      r.fee_estimated = estimated;
      await updateRows('list_purchases', `id=eq.${r.id}`, { fee_cents: fee, net_cents: r.net_cents, fee_estimated: estimated });
    }

    const [last] = await selectRows('ops_reports', 'select=created_at&order=created_at.desc&limit=1');
    const since = last ? new Date(last.created_at) : new Date(0);
    const recent = rows.filter((r) => new Date(r.created_at) > since);
    const sum = (a, k) => a.reduce((s, r) => s + (r[k] || 0), 0);
    const byList = {};
    for (const r of recent) {
      const k = r.bundle ? 'all 10 bundle' : (r.slugs || []).length > 1 ? 'upsell (multi-list)' : (r.slugs || [])[0];
      byList[k] = (byList[k] || 0) + 1;
    }
    const out = {
      since: last ? since.toISOString() : null,
      now: new Date().toISOString(),
      period: { sales: recent.length, gross_cents: sum(recent, 'amount_cents'), fees_cents: sum(recent, 'fee_cents'), net_cents: sum(recent, 'net_cents'), by_list: byList },
      to_date: { sales: rows.length, gross_cents: sum(rows, 'amount_cents'), net_cents: sum(rows, 'net_cents') },
      fees_estimated: rows.some((r) => r.fee_estimated),
    };
    if (url.searchParams.get('peek') !== '1') await insertRow('ops_reports', { sales: recent.length, net_cents: out.period.net_cents });
    return json(res, 200, out);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'report failed' });
  }
}
