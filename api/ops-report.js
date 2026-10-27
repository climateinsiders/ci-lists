import { selectRows, insertRow, updateRows, stripe, json } from './_lib.js';

// GET /api/ops-report?key=<ops_tokens.token>[&peek=1]
// Sales since the last report and to date, net of Stripe fees. Used by the 4-hourly Slack update.
// Only paid investor-list purchases (list_purchases with amount > 0) are counted.
// Fees come from the Stripe balance transaction. If the restricted key can't read it, the fee is
// estimated (2.9% + 30c, +1.5% for non-US cards is not knowable here) and flagged as estimated.
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const key = String(url.searchParams.get('key') || '');
    if (!/^[a-f0-9]{32,64}$/.test(key)) return json(res, 403, { error: 'no' });
    const [tok] = await selectRows('ops_tokens', `token=eq.${key}&purpose=eq.sales_report&select=token`);
    if (!tok) return json(res, 403, { error: 'no' });
    res.setHeader('Cache-Control', 'no-store');

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
