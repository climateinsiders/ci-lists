import { insertRow, readJson } from './_lib.js';

// POST /api/track  { event, path, slug?, utm_source?, utm_campaign?, utm_content?, ref?, device?, v? }
// First-party funnel events for the lists site: page view, sheet preview opened, FAQ opened, checkout started.
// No personal data: `v` is a random id the browser keeps in localStorage, `ref` is reduced to its hostname.
// Read it with the site_funnel_daily view. Always answers 204 so a tracking problem never shows to a buyer.
const EVENTS = new Set(['view', 'sheet_open', 'faq_open', 'checkout_start']);
const clip = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|linkedinbot/i;

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && !BOT.test(req.headers['user-agent'] || '')) {
      const b = await readJson(req);
      const event = String(b.event || '');
      const path = clip(b.path, 120);
      if (EVENTS.has(event) && path && path.startsWith('/')) {
        let host = null;
        try { host = b.ref ? new URL(String(b.ref)).hostname.slice(0, 80) : null; } catch {}
        await insertRow('site_events', {
          event,
          path,
          slug: clip(b.slug, 60),
          utm_source: clip(b.utm_source, 60),
          utm_campaign: clip(b.utm_campaign, 60),
          utm_content: clip(b.utm_content, 60),
          referrer_host: host,
          device: b.device === 'mobile' ? 'mobile' : 'desktop',
          visitor: /^[a-z0-9]{8,32}$/.test(String(b.v || '')) ? String(b.v) : null,
        });
      }
    }
  } catch (err) {
    console.error('track', err.message);
  }
  res.statusCode = 204;
  res.end();
}
