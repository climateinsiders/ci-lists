import { updateRows, selectRows } from './_lib.js';

// GET or POST /api/unsubscribe?t=<purchase token>  (also used as the one-click List-Unsubscribe target)
// Stops follow-up emails for every purchase and sample request on that email address.
export default async function handler(req, res) {
  const t = new URL(req.url, 'http://x').searchParams.get('t') || '';
  let ok = false;
  try {
    if (/^[a-f0-9]{16,64}$/.test(t)) {
      const [p] = await selectRows('list_purchases', `token=eq.${t}&select=email`);
      if (p) {
        const now = new Date().toISOString();
        const e = encodeURIComponent(p.email);
        await updateRows('list_purchases', `email=ilike.${e}`, { unsubscribed_at: now });
        await updateRows('list_sample_requests', `email=ilike.${e}`, { unsubscribed_at: now });
        ok = true;
      }
    }
  } catch (err) {
    console.error(err);
  }
  res.statusCode = ok ? 200 : 400;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><link rel="icon" href="https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/658538a0538bd8c8a8da2e34_fav-sm.jpg" type="image/jpeg"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#fbf5ea;color:#1f1b16;display:grid;place-items:center;min-height:90vh;margin:0;padding:24px;text-align:center"><div><h1 style="font-size:32px;margin:0 0 8px">${ok ? 'Done. No more emails.' : 'That link did not work.'}</h1><p style="font-size:17px">${ok ? 'Your lists and Airtable links keep working.' : 'Reply "stop" to any of my emails and I will take you off by hand.'}</p></div></body>`);
}
