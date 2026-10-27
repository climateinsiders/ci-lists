import { getList, readJson, json, insertRow, isEmail, selectRows } from './_lib.js';
import { deliverSample } from './_deliver.js';

// POST /api/sample  { email, slug, attribution }
// Emails 10 real rows from the list and records the lead.
export default async function handler(req, res) {
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

    await insertRow('list_sample_requests', {
      email,
      slug: list.slug,
      attribution: body.attribution && typeof body.attribution === 'object' ? body.attribution : null,
    });
    await deliverSample({ email, list });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Could not send the sample. Email yoann@climateinsiders.com.' });
  }
}
