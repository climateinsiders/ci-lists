import { getActiveLists, stripe, json } from './_lib.js';

// GET /api/session?session_id=cs_...  ->  { remaining: ["500 US family office contacts", ...] }
// What the buyer of that checkout session does not own yet. Used by the post-purchase upsell.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  try {
    const sid = String(new URL(req.url, 'http://x').searchParams.get('session_id') || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json(res, 400, { error: 'Bad session' });
    const s = await stripe(`checkout/sessions/${sid}`);
    if (s.payment_status !== 'paid' || s.metadata?.upsell === '1') return json(res, 200, { remaining: [] });
    const owned = (s.metadata?.slugs || '').split(',').filter(Boolean);
    const lists = await getActiveLists();
    return json(res, 200, { remaining: lists.filter((l) => !owned.includes(l.slug)).map((l) => l.name) });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'lookup failed' });
  }
}
