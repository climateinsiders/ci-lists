import { json, readJson, sendEmail, textToHtml, siteUrl, isEmail } from './_lib.js';
import {
  db, dbAll, hashPassword, verifyPassword, sha256, newToken, sessionCookie, clearCookie, requireUser,
  clientIp, sameOrigin, recentAttempts, logAttempt, storeEvents, eventsFromBody,
} from './_dash.js';
import { buildDashboard } from './_dash-metrics.js';

// Mission Control API, one function for every dashboard call: /api/dash?op=<op>
//   GET  me | data
//   POST login | reset-request | set-password | logout | post | post-delete | import-leads
// Everything except login, reset-request and set-password needs the session cookie.
const MAX_LOGIN_FAILS = 10; // per email per hour
const MAX_IP_FAILS = 40; // per IP per hour
const MAX_RESETS = 5; // reset emails per email (or 20 per IP) per hour
const NEUTRAL = 'If this email has access, a link is on its way. Check your inbox in a minute.';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const url = new URL(req.url, 'http://x');
  const op = url.searchParams.get('op') || (url.pathname.match(/\/api\/dash-([a-z-]+)/) || [])[1] || '';
  try {
    if (req.method === 'GET') {
      if (op === 'me') {
        const u = await requireUser(req);
        return u ? json(res, 200, { email: u.email }) : json(res, 401, { error: 'login' });
      }
      if (op === 'data') return data(req, res);
      return json(res, 404, { error: 'unknown op' });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
    if (!sameOrigin(req)) return json(res, 403, { error: 'bad origin' });
    let body;
    try {
      body = await readJson(req);
    } catch {
      return json(res, 400, { error: 'Bad JSON' });
    }
    if (op === 'login') return login(req, res, body);
    if (op === 'reset-request') return resetRequest(req, res, body);
    if (op === 'set-password') return setPassword(req, res, body);
    if (op === 'logout') {
      res.setHeader('Set-Cookie', clearCookie());
      return json(res, 200, { ok: true });
    }
    const user = await requireUser(req);
    if (!user) return json(res, 401, { error: 'login' });
    if (op === 'post') return savePost(res, body);
    if (op === 'post-delete') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Bad id' });
      await db(`posts?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
      return json(res, 200, { ok: true });
    }
    if (op === 'import-leads') {
      const items = eventsFromBody(body.leads !== undefined ? body.leads : body);
      if (!items.length) return json(res, 400, { error: 'Send a JSON array of leads' });
      return json(res, 200, await storeEvents(items, { source: 'backfill' }));
    }
    return json(res, 404, { error: 'unknown op' });
  } catch (err) {
    console.error('dash', op, err);
    return json(res, 500, { error: 'Something went wrong. Try again.' });
  }
}

async function login(req, res, body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!isEmail(email) || !password) return json(res, 400, { error: 'Enter your email and password.' });
  const ip = clientIp(req);
  const fails = await recentAttempts({ email, ip, kind: 'login' });
  if (fails.email >= MAX_LOGIN_FAILS || fails.ip >= MAX_IP_FAILS) {
    return json(res, 429, { error: 'Too many tries. Wait an hour, or get a reset link.' });
  }
  const [u] = await db(`dashboard_users?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,password_set_at`);
  const ok = verifyPassword(password, u?.password_hash) && Boolean(u?.password_set_at);
  await logAttempt({ email, ip, kind: 'login', success: ok });
  if (!ok) return json(res, 401, { error: 'Wrong email or password.' });
  await db(`dashboard_users?id=eq.${u.id}`, { method: 'PATCH', body: { last_login_at: new Date().toISOString() }, prefer: 'return=minimal' });
  res.setHeader('Set-Cookie', sessionCookie(u.email, Date.parse(u.password_set_at)));
  return json(res, 200, { email: u.email });
}

async function resetRequest(req, res, body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return json(res, 400, { error: 'Enter a valid email.' });
  const ip = clientIp(req);
  const sent = await recentAttempts({ email, ip, kind: 'reset', failedOnly: false });
  if (sent.email >= MAX_RESETS || sent.ip >= MAX_RESETS * 4) return json(res, 200, { message: NEUTRAL });
  const [u] = await db(`dashboard_users?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash`);
  await logAttempt({ email, ip, kind: 'reset', success: Boolean(u) });
  if (u) {
    const token = newToken();
    await db(`dashboard_users?id=eq.${u.id}`, {
      method: 'PATCH',
      body: { reset_token_hash: sha256(token), reset_expires_at: new Date(Date.now() + 3600000).toISOString() },
      prefer: 'return=minimal',
    });
    const link = `${siteUrl()}/dashboard#reset=${token}`;
    const text = `Hi,

Here is your link to ${u.password_hash ? 'reset your password for' : 'set your password for'} Mission Control, the Climate Insiders lists dashboard:

${link}

It works once and expires in one hour. If you did not ask for it, ignore this email. Nothing changes.

Yoann`;
    try {
      await sendEmail({ to: u.email, subject: 'Your Mission Control login link', text, html: textToHtml(text), tags: [{ name: 'type', value: 'dashboard_reset' }] });
    } catch (e) {
      console.error('reset email failed', e.message);
    }
  }
  return json(res, 200, { message: NEUTRAL });
}

async function setPassword(req, res, body) {
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return json(res, 400, { error: 'This link is not valid. Ask for a new one.' });
  if (password.length < 10) return json(res, 400, { error: 'Use at least 10 characters.' });
  if (password.length > 200) return json(res, 400, { error: 'That password is too long.' });
  if (password !== String(body.confirm || '')) return json(res, 400, { error: 'The two passwords do not match.' });
  const [u] = await db(`dashboard_users?reset_token_hash=eq.${sha256(token)}&select=id,email,reset_expires_at`);
  if (!u || !u.reset_expires_at || Date.parse(u.reset_expires_at) < Date.now()) {
    return json(res, 400, { error: 'This link has expired or was already used. Ask for a new one.' });
  }
  const setAt = new Date();
  await db(`dashboard_users?id=eq.${u.id}`, {
    method: 'PATCH',
    body: { password_hash: hashPassword(password), password_set_at: setAt.toISOString(), reset_token_hash: null, reset_expires_at: null, last_login_at: setAt.toISOString() },
    prefer: 'return=minimal',
  });
  res.setHeader('Set-Cookie', sessionCookie(u.email, setAt.getTime()));
  return json(res, 200, { email: u.email });
}

const POST_FIELDS = {
  title: 'text', posted_at: 'date', url: 'url', keyword: 'text', list_slug: 'text', notes: 'text',
  impressions: 'int', reactions: 'int', comments_count: 'int', reposts: 'int',
};

async function savePost(res, body) {
  const row = {};
  for (const [k, kind] of Object.entries(POST_FIELDS)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (v === '' || v === undefined) v = null;
    if (v !== null) {
      if (kind === 'int') {
        v = Number(String(v).replace(/[\s,]/g, ''));
        if (!Number.isInteger(v) || v < 0) return json(res, 400, { error: `${k.replace('_', ' ')} must be a whole number.` });
      } else if (kind === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return json(res, 400, { error: 'Date must look like 2026-10-27.' });
      } else if (kind === 'url') {
        if (!/^https?:\/\/\S+$/.test(String(v))) return json(res, 400, { error: 'The link must start with https://' });
      }
      if (typeof v === 'string') v = v.trim().slice(0, k === 'notes' ? 2000 : 500);
    }
    row[k] = v;
  }
  const id = body.id ? Number(body.id) : null;
  if (!id && !row.title) return json(res, 400, { error: 'Give the post a title.' });
  if ('title' in row && !row.title) return json(res, 400, { error: 'Give the post a title.' });
  row.updated_at = new Date().toISOString();
  if (id) {
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Bad id' });
    const out = await db(`posts?id=eq.${id}`, { method: 'PATCH', body: row, prefer: 'return=representation' });
    if (!out?.length) return json(res, 404, { error: 'Post not found' });
    return json(res, 200, { post: out[0] });
  }
  const out = await db('posts', { method: 'POST', body: row, prefer: 'return=representation' });
  return json(res, 200, { post: out[0] });
}

async function data(req, res) {
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: 'login' });
  const [purchases, posts, events, lists, tok] = await Promise.all([
    dbAll('list_purchases?amount_cents=gt.0&select=created_at,first_name,slugs,bundle,amount_cents,currency,fee_cents,net_cents,fee_estimated,attribution&order=created_at.asc'),
    db('posts?select=*&order=posted_at.desc.nullslast,id.desc'),
    dbAll('funnel_events?select=id,event_type,keyword,person_name,profile_url,post_ref,occurred_at&order=occurred_at.asc'),
    db('paid_lists?select=slug,name,keyword&order=sort_order.asc'),
    db('ops_tokens?purpose=eq.turnward_webhook&select=token&limit=1'),
  ]);
  const out = buildDashboard({ purchases, posts, events, lists, now: new Date() });
  out.me = user.email;
  out.list_options = lists.map((l) => ({ slug: l.slug, name: l.name }));
  out.webhook_url = tok?.[0] ? `${siteUrl()}/api/turnward-webhook?key=${tok[0].token}` : null;
  return json(res, 200, out);
}
