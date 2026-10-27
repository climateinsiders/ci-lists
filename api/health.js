import { json } from './_lib.js';

// GET /api/health -> which settings this deployment can see. Yes/no only, never a value.
export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  const has = (name) => Boolean((process.env[name] || '').trim());
  const pk = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  const mode = (k) => (k.startsWith('pk_live_') || k.startsWith('sk_live_') ? 'live' : k.startsWith('pk_test_') || k.startsWith('sk_test_') ? 'test' : k ? 'unknown' : null);
  res.setHeader('Cache-Control', 'no-store');
  return json(res, 200, {
    embedded_checkout: Boolean(pk),
    stripe_secret_key: has('STRIPE_SECRET_KEY'),
    stripe_publishable_key: Boolean(pk),
    stripe_modes_match: pk && sk ? mode(pk) === mode(sk) : null,
    stripe_webhook_secret: has('STRIPE_WEBHOOK_SECRET'),
    supabase: has('SUPABASE_URL') && (has('SUPABASE_SECRET_KEY') || has('SUPABASE_SERVICE_ROLE_KEY')),
    resend: has('RESEND_API_KEY'),
    site_url: has('SITE_URL'),
    vercel_env: process.env.VERCEL_ENV || null,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
  });
}
