import { getActiveLists, getEntries, toCsv, stripe, json } from './_lib.js';

// GET /api/download?session_id=cs_...&slug=europe-500  -> the CSV, only for a paid session that owns that list.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  try {
    const url = new URL(req.url, 'http://x');
    const sid = String(url.searchParams.get('session_id') || '');
    const slug = String(url.searchParams.get('slug') || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json(res, 400, { error: 'Bad session' });
    const s = await stripe(`checkout/sessions/${sid}`);
    const owned = (s.metadata?.slugs || '').split(',').filter(Boolean);
    if (s.payment_status !== 'paid' || !owned.includes(slug)) return json(res, 403, { error: 'Not available' });
    const list = (await getActiveLists()).find((l) => l.slug === slug);
    if (!list) return json(res, 404, { error: 'Unknown list' });
    const csv = toCsv(await getEntries(slug), list);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${list.csv_filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(csv);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'download failed' });
  }
}
