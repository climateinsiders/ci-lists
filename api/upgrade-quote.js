import { json, upgradeQuote } from './_lib.js';

// GET /api/upgrade-quote?t=<token>  ->  { price, owned, active, bundleOwned, expiresAt }
// Used by /all to show "your list payment counts" pricing to people who already bought a list.
export default async function handler(req, res) {
  try {
    const t = new URL(req.url, 'http://x').searchParams.get('t');
    const q = await upgradeQuote(t);
    if (!q) return json(res, 404, { error: 'not found' });
    const { email, paid, ...pub } = q;
    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, pub);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'quote failed' });
  }
}
