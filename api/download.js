import { getActiveLists, getEntries, toCsv, stripe, json } from './_lib.js';
import { toXlsx, xlsxFilename } from './_xlsx.js';

// GET /api/download?session_id=cs_...&slug=europe-500[&format=csv]  -> the Excel file (or CSV), only for a paid session that owns that list.
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
    const entries = await getEntries(slug);
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-store');
    if (url.searchParams.get('format') === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${list.csv_filename}"`);
      return res.end(toCsv(entries, list));
    }
    const name = (s.custom_fields || []).find((f) => f.key === 'first_name')?.text?.value || '';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${xlsxFilename(list)}"`);
    res.end(toXlsx(entries, list, { name: name.trim() }));
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'download failed' });
  }
}
