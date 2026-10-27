import { json, readRaw } from './_lib.js';
import { db, storeEvents, eventsFromBody } from './_dash.js';

// POST /api/turnward-webhook?key=<ops_tokens.token where purpose = 'turnward_webhook'>
// Stores Turnward lead events (comment or DM) in funnel_events. Accepts any JSON shape: one event,
// an array, or { events | leads | data: [...] }. The raw payload is kept; keyword, name, profile,
// type and time are pulled out when present. Duplicates are ignored (see normalizeEvent).
//
// One-time backfill uses the same URL with &backfill=1 and a JSON array like
//   [{ "name": "...", "keyword": "500", "source": "comment" | "dm", "first_seen_at": "2026-10-27T10:00:00Z", "profile_url": "https://www.linkedin.com/in/..." }]
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return json(res, 200, { ok: true, hint: 'POST lead events as JSON' }); // some tools ping the URL first
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const url = new URL(req.url, 'http://x');
    const key = String(url.searchParams.get('key') || req.headers['x-webhook-key'] || '');
    if (!/^[a-f0-9]{32,64}$/.test(key)) return json(res, 403, { error: 'no' });
    const [tok] = await db(`ops_tokens?token=eq.${key}&purpose=eq.turnward_webhook&select=token`);
    if (!tok) return json(res, 403, { error: 'no' });

    let body;
    let parsed;
    try {
      parsed = req.body; // Vercel parses JSON lazily and throws on a malformed body
    } catch {
      return json(res, 400, { error: 'Bad JSON' });
    }
    if (parsed && typeof parsed === 'object' && !Buffer.isBuffer(parsed)) body = parsed;
    else {
      const raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : await readRaw(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        // Form-encoded or plain text: keep it as fields so nothing is lost.
        body = Object.fromEntries(new URLSearchParams(raw));
        if (!Object.keys(body).length) body = { text: String(raw).slice(0, 10000) };
      }
    }
    const items = eventsFromBody(body);
    if (!items.length) return json(res, 200, { received: 0, inserted: 0 });
    const out = await storeEvents(items, { source: url.searchParams.get('backfill') === '1' ? 'backfill' : 'turnward' });
    return json(res, 200, out);
  } catch (err) {
    console.error('turnward webhook', err);
    return json(res, 500, { error: 'store failed' });
  }
}
