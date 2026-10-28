import crypto from 'node:crypto';
import { getList, readJson, json, insertRow, isEmail, selectRows } from './_lib.js';
import { deliverSample } from './_deliver.js';

// POST /api/sample  { email, slug, attribution }
// Emails the top 10 rows of the list as an Excel and records the lead (the nurture email follows a day later).
// The endpoint emails whatever address it is given, so it is throttled: once per list per email per day,
// and a per-IP daily cap. Set SAMPLE_ENABLED=0 to switch it off.
export default async function handler(req, res) {
  if (process.env.SAMPLE_ENABLED === '0') return json(res, 410, { error: 'Gone' });
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!isEmail(email)) return json(res, 400, { error: 'That email does not look right.' });
    if (body.website) return json(res, 200, { ok: true }); // honeypot
    const list = await getList(String(body.slug || ''));
    if (!list) return json(res, 400, { error: 'Unknown list' });

    // Soft rate limit: one sample per list per email per day.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recent = await selectRows('list_sample_requests', `email=eq.${encodeURIComponent(email)}&slug=eq.${list.slug}&created_at=gte.${since}&select=id`);
    if (recent.length) return json(res, 200, { ok: true, already: true });

    // Per-IP cap (hashed, never stored raw): 6 requests a day across all lists.
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    const ip = crypto.createHash('sha256').update(`ci-sample:${fwd}`).digest('hex').slice(0, 24);
    const fromIp = await selectRows('list_sample_requests', `attribution->>ip=eq.${ip}&created_at=gte.${since}&select=id`);
    if (fromIp.length >= 6) return json(res, 429, { error: 'Too many requests from this network. Try again tomorrow.' });

    const attribution = body.attribution && typeof body.attribution === 'object' ? { ...body.attribution } : {};
    attribution.ip = ip;
    await deliverSample({ email, list }); // first, so a failed send never locks the visitor out for a day
    await insertRow('list_sample_requests', { email, slug: list.slug, attribution });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Could not send the sample. Try again in a minute.' });
  }
}
