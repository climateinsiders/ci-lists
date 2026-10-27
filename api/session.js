import { getActiveLists, stripe, json } from './_lib.js';

// GET /api/session?session_id=cs_...
//   -> { email, created, upsell, lists: [{ slug, name, airtable_url }] }
// What /thanks needs: the lists this checkout bought, their Airtable links, and when it was paid
// (the one-time offer runs 24h from `created`).
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  try {
    const sid = String(new URL(req.url, 'http://x').searchParams.get('session_id') || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json(res, 400, { error: 'Bad session' });
    const s = await stripe(`checkout/sessions/${sid}`);
    if (s.payment_status !== 'paid') return json(res, 402, { error: 'Not paid' });
    const owned = (s.metadata?.slugs || '').split(',').filter(Boolean);
    const lists = (await getActiveLists()).filter((l) => owned.includes(l.slug));
    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, {
      email: s.customer_details?.email || null,
      created: s.created,
      upsell: s.metadata?.upsell === '1',
      lists: lists.map((l) => ({ slug: l.slug, name: l.name, airtable_url: l.airtable_url || null })),
    });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'lookup failed' });
  }
}
