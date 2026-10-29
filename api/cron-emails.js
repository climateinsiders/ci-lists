import { env, json, selectRows, updateRows, getBundleLists, upgradeQuote } from './_lib.js';
import { send } from './_deliver.js';
import { templateEmail, offerEmail, followupEmail, sampleNudgeEmail } from './_emails.js';

// Runs daily (vercel.json crons). Sends the next email in each buyer's sequence.
//   step 1 -> E1 template email, day 2
//   step 2 -> E2 offer email,    day 4 (single-list buyers only; bundle buyers skip it)
//   step 3 -> E3 follow-up email, day 7 (last call P.S. if the upgrade credit is still open)
// Sample requesters get one nudge on day 1 if they haven't bought.
const DAY = 86400000;
const SCHEDULE = { 1: 2, 2: 4, 3: 7 };

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${env('CRON_SECRET')}`) return json(res, 401, { error: 'unauthorized' });

  // ?fast=1&email=you@x.com sends that buyer's next email now, ignoring the day schedule. For testing.
  const qs = new URL(req.url, 'http://x').searchParams;
  const fast = qs.get('fast') === '1';
  const only = (qs.get('email') || '').toLowerCase();
  const lists = await getBundleLists();
  const log = { sent: 0, skipped: 0, errors: 0 };

  const due = await selectRows(
    'list_purchases',
    'delivered_at=not.is.null&unsubscribed_at=is.null&followup_step=gte.1&followup_step=lte.3&select=id,email,first_name,token,bundle,followup_step,created_at&order=created_at.asc&limit=200',
  );
  for (const p of due) {
    const age = (Date.now() - new Date(p.created_at).getTime()) / DAY;
    if (only && p.email.toLowerCase() !== only) { log.skipped++; continue; }
    if (!fast && age < SCHEDULE[p.followup_step]) { log.skipped++; continue; }
    try {
      let next = p.followup_step + 1;
      if (p.followup_step === 1) {
        await send(p.email, templateEmail({ token: p.token, bundle: p.bundle, name: p.first_name }), { token: p.token, tag: 'list_e1' });
      } else if (p.followup_step === 2) {
        const quote = await upgradeQuote(p.token);
        if (!p.bundle && quote && quote.active && quote.paid > 0) {
          await send(p.email, offerEmail({ token: p.token, quote, allLists: lists, name: p.first_name }), { token: p.token, tag: 'list_e2' });
        }
      } else if (p.followup_step === 3) {
        const quote = p.bundle ? null : await upgradeQuote(p.token);
        await send(p.email, followupEmail({ token: p.token, quote, bundle: p.bundle, name: p.first_name }), { token: p.token, tag: 'list_e3' });
        next = 4;
      }
      await updateRows('list_purchases', `id=eq.${p.id}`, { followup_step: next, last_email_at: new Date().toISOString() });
      log.sent++;
    } catch (err) {
      console.error(err);
      log.errors++;
    }
  }

  const since = new Date(Date.now() - 1 * DAY).toISOString();
  const samples = await selectRows(
    'list_sample_requests',
    `followup_step=eq.0&unsubscribed_at=is.null&created_at=lte.${since}&select=id,email,slug&limit=200`,
  );
  for (const r of samples) {
    try {
      const bought = await selectRows('list_purchases', `email=ilike.${encodeURIComponent(r.email)}&select=id&limit=1`);
      const list = lists.find((l) => l.slug === r.slug);
      if (!bought.length && list) {
        const [st] = await selectRows('paid_list_entries', `slug=eq.${list.slug}&select=count`);
        list.stats = { rows: st?.count || 0 };
        await send(r.email, sampleNudgeEmail({ list }), { tag: 'list_sample_nudge' });
        log.sent++;
      }
      await updateRows('list_sample_requests', `id=eq.${r.id}`, { followup_step: 1 });
    } catch (err) {
      console.error(err);
      log.errors++;
    }
  }

  return json(res, 200, log);
}
