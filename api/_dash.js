// Mission Control helpers: Supabase access, password hashing, signed session cookie, rate limits,
// and the Turnward lead-event normaliser. Zero dependencies (node:crypto only).
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { env } from './_lib.js';

// ---------- Supabase (service role, server only) ----------
function sbKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SECRET_KEY');
}

export async function db(path, { method = 'GET', body, prefer, range } = {}) {
  const key = sbKey();
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...(range ? { Range: range } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// All rows of a query, 1000 at a time.
export async function dbAll(path, max = 20000) {
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    const rows = await db(path, { range: `${from}-${from + 999}` });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// ---------- passwords (scrypt, random salt) ----------
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = scryptSync(String(pw), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'));

export function verifyPassword(pw, stored) {
  // Always run scrypt, even for unknown users, so timing says nothing about who has access.
  const parts = String(stored || DUMMY_HASH).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const want = Buffer.from(hash, 'base64');
  const got = scryptSync(String(pw), Buffer.from(salt, 'base64'), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return Boolean(stored) && got.length === want.length && timingSafeEqual(got, want);
}

export function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

export function newToken() {
  return randomBytes(32).toString('hex');
}

// ---------- session cookie (HMAC signed, 14 days) ----------
export const COOKIE = 'ci_dash';
const SESSION_MS = 14 * 86400000;
const b64u = (buf) => Buffer.from(buf).toString('base64url');

function sessionKey() {
  return createHash('sha256').update(`${sbKey()}dash-session`).digest();
}

function sign(payload) {
  return createHmac('sha256', sessionKey()).update(payload).digest('base64url');
}

// `pv` is the user's password_set_at in ms: setting a new password logs out every other session.
export function sessionCookie(email, pv) {
  const payload = b64u(JSON.stringify({ e: email, v: pv, x: Date.now() + SESSION_MS }));
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSession(req) {
  const raw = String(req.headers?.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!s.e || !s.x || s.x < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

// Returns { email } for a valid session of a user who still has access, else null.
export async function requireUser(req) {
  const s = readSession(req);
  if (!s) return null;
  const [u] = await db(`dashboard_users?email=eq.${encodeURIComponent(s.e)}&select=email,password_set_at`);
  if (!u || !u.password_set_at || Date.parse(u.password_set_at) !== s.v) return null;
  return { email: u.email };
}

// ---------- request helpers ----------
export function clientIp(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 64) || null;
}

// Blocks cross-site POSTs (on top of SameSite=Lax and the JSON content type).
export function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export async function recentAttempts({ email, ip, kind, failedOnly = true }) {
  const since = new Date(Date.now() - 3600000).toISOString();
  const f = `kind=eq.${kind}&created_at=gte.${encodeURIComponent(since)}${failedOnly ? '&success=eq.false' : ''}&select=id`;
  const [byEmail, byIp] = await Promise.all([
    email ? db(`dashboard_auth_attempts?email=eq.${encodeURIComponent(email)}&${f}`) : [],
    ip ? db(`dashboard_auth_attempts?ip=eq.${encodeURIComponent(ip)}&${f}`) : [],
  ]);
  return { email: byEmail.length, ip: byIp.length };
}

export function logAttempt(row) {
  return db('dashboard_auth_attempts', { method: 'POST', body: row, prefer: 'return=minimal' }).catch((e) => console.warn('attempt log failed', e.message));
}

// ---------- Turnward lead events ----------
// The payload shape is not documented, so: flatten it, look for likely key names, keep the raw JSON.
function flatten(obj, prefix = '', out = {}, depth = 0) {
  if (obj === null || typeof obj !== 'object' || depth > 5) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out, depth + 1);
    else if (Array.isArray(v)) v.slice(0, 3).forEach((item, i) => (item && typeof item === 'object' ? flatten(item, `${key}.${i}`, out, depth + 1) : (out[`${key}.${i}`] = item)));
    else out[key] = v;
  }
  return out;
}

const norm = (k) => k.toLowerCase().replace(/[^a-z0-9.]/g, '');

// First non-empty value whose last key segment (or full path) matches one of `names`, shallowest first.
function pick(flat, names) {
  const want = names.map(norm);
  const entries = Object.entries(flat).sort((a, b) => a[0].split('.').length - b[0].split('.').length);
  for (const n of want) {
    for (const [k, v] of entries) {
      const nk = norm(k).replace(/(\.\d+)+$/, ''); // keywords.0 -> keywords
      if ((nk === n || nk.split('.').pop() === n) && v !== null && v !== undefined && String(v).trim() !== '') return v;
    }
  }
  return null;
}

function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) {
    const n = Number(v);
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

const TYPE_KEYS = ['event_type', 'eventType', 'type', 'event', 'kind', 'source', 'channel', 'trigger', 'trigger_type', 'action'];

function typeOf(flat) {
  // dm_sent = a DM we sent with the list link (logged by our own outreach), not an inbound lead.
  const test = (s) => (/dm_sent|outbound|link_sent/.test(s) ? 'dm_sent' : /comment/.test(s) ? 'comment' : /\bdms?\b|direct|message|inbox|conversation/.test(s) ? 'dm' : null);
  const explicit = Object.entries(flat)
    .filter(([k]) => TYPE_KEYS.map(norm).includes(norm(k).split('.').pop()))
    .map(([, v]) => String(v).toLowerCase())
    .join(' ');
  return test(explicit) || test(Object.keys(flat).join(' ').toLowerCase()) || 'other';
}

export function normalizeEvent(payload, { source = 'turnward', now = new Date() } = {}) {
  const flat = flatten(payload && typeof payload === 'object' ? payload : { value: payload });
  const first = pick(flat, ['first_name', 'firstName']);
  const last = pick(flat, ['last_name', 'lastName']);
  const name = pick(flat, ['full_name', 'fullName', 'person_name', 'lead_name', 'author_name', 'commenter_name', 'sender_name', 'display_name', 'name']) || [first, last].filter(Boolean).join(' ') || null;
  let profile = pick(flat, ['profile_url', 'profileUrl', 'linkedin_url', 'linkedinUrl', 'linkedin_profile', 'profile_link', 'public_profile_url', 'profile']);
  if (!profile || !/linkedin\.com/i.test(String(profile))) {
    const anyIn = Object.values(flat).find((v) => typeof v === 'string' && /linkedin\.com\/in\//i.test(v));
    if (anyIn) profile = anyIn;
  }
  const keyword = pick(flat, ['keyword', 'trigger_keyword', 'triggerKeyword', 'matched_keyword', 'matchedKeyword', 'keywords', 'campaign_keyword', 'utm_campaign']);
  const when = toDate(pick(flat, ['first_seen_at', 'firstSeenAt', 'occurred_at', 'occurredAt', 'timestamp', 'created_at', 'createdAt', 'commented_at', 'sent_at', 'received_at', 'time', 'date'])) || now;
  const sourceId = pick(flat, ['event_id', 'eventId', 'comment_id', 'commentId', 'message_id', 'messageId', 'lead_id', 'leadId', 'id']);
  const postRef = pick(flat, ['post_url', 'postUrl', 'post_id', 'postId', 'post_urn', 'activity_urn', 'urn']);
  const type = typeOf(flat);
  const kw = keyword === null ? null : String(keyword).trim().slice(0, 80) || null;
  const prof = profile ? String(profile).trim().split('?')[0].replace(/\/$/, '').slice(0, 300) : null;
  const person = name ? String(name).trim().slice(0, 160) : null;
  const minute = when.toISOString().slice(0, 16);
  const who = (prof || person || '').toLowerCase();
  const dedupe = sourceId !== null && String(sourceId).trim() !== ''
    ? `id:${String(sourceId).slice(0, 120)}|${type}`
    : `p:${who}|${type}|${(kw || '').toLowerCase()}|${minute}`;
  return {
    source,
    event_type: type,
    keyword: kw,
    person_name: person,
    profile_url: prof,
    post_ref: postRef ? String(postRef).slice(0, 300) : null,
    source_id: sourceId !== null ? String(sourceId).slice(0, 120) : null,
    occurred_at: when.toISOString(),
    dedupe_key: dedupe.slice(0, 500),
    raw: payload,
  };
}

// Turnward may send one event, an array, or a wrapper like { events: [...] } / { data: [...] }.
export function eventsFromBody(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    for (const k of ['events', 'leads', 'data', 'items', 'records']) if (Array.isArray(body[k]) && body[k].length && typeof body[k][0] === 'object') return body[k];
    return [body];
  }
  return [];
}

export async function storeEvents(items, { source = 'turnward' } = {}) {
  const rows = items.slice(0, 5000).map((p) => normalizeEvent(p, { source }));
  // Same key twice in one batch would fail the upsert, so keep the first.
  const seen = new Set();
  const uniq = rows.filter((r) => (seen.has(r.dedupe_key) ? false : seen.add(r.dedupe_key)));
  let inserted = 0;
  for (let i = 0; i < uniq.length; i += 500) {
    const res = await db('funnel_events?on_conflict=dedupe_key&select=id', {
      method: 'POST',
      body: uniq.slice(i, i + 500),
      prefer: 'resolution=ignore-duplicates,return=representation',
    });
    inserted += (res || []).length;
  }
  return { received: items.length, inserted, duplicates: items.length - inserted };
}
