import { getActiveLists, stripe, json } from './_lib.js';

// GET /api/session?session_id=cs_...
//   -> { email, created, upsell, lists: [{ slug, name, airtable_url }], access? }
// `access` (database, kits, newsletter links) is only returned for a paid grand slam (upsell) session.
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
    const upsell = s.metadata?.upsell === '1';
    const link = (name) => process.env[name] || null;
    return json(res, 200, {
      access: upsell
        ? {
            database_url: link('DATABASE_URL'),
            outreach_kit_url: link('OUTREACH_KIT_URL'),
            fundraising_kit_url: link('FUNDRAISING_KIT_URL'),
            newsletter_url: link('NEWSLETTER_URL'),
          }
        : undefined,
      email: s.customer_details?.email || null,
      created: s.created,
      upsell,
      lists: lists.map((l) => ({ slug: l.slug, name: l.name, airtable_url: l.airtable_url || null })),
    });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'lookup failed' });
  }
}
