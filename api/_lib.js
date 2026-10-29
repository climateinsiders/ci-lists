// Shared helpers for the serverless functions. Zero dependencies: Stripe, Resend and
// Supabase are all called over plain HTTPS.


export const BUNDLE_PRICE_CENTS = 69000; // all 10 lists on /all
export const LIST_PRICE_CENTS = 13000; // live price comes from paid_lists.price_cents
export const UPSELL_PRICE_CENTS = 39000; // grand slam offer on /thanks for 24h: every list the buyer doesn't own yet
export const MIN_UPGRADE_CENTS = 5000;
export const UPGRADE_DAYS = 10; // the "your single-list payment counts" credit window
// Unique across all 10 lists (Europe 500 overlaps the regional lists). Update if the data changes.
export const UNIQUE_INVESTORS = 2426;
export const UNIQUE_EMAILS = 1363;

export function env(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env var ${name}`);
  }
  return v;
}

export function siteUrl() {
  return env('SITE_URL', 'https://lists.climateinsiders.com').replace(/\/$/, '');
}

// ---------- Supabase (PostgREST, service role) ----------
async function sb(path, { method = 'GET', body, prefer } = {}) {
  const url = `${env('SUPABASE_URL')}/rest/v1/${path}`;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SECRET_KEY'));
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} -> ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getActiveLists() {
  // Local dev (scripts/dev-server.mjs) without Supabase keys: use the fixture lists.
  if (process.env.LOCAL_DEV === '1' && !process.env.SUPABASE_URL) {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(new URL('../scripts/fixture.json', import.meta.url), 'utf8');
    return JSON.parse(raw).lists;
  }
  return sb('paid_lists?active=eq.true&order=sort_order.asc');
}

export async function getList(slug) {
  const rows = await sb(`paid_lists?slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`);
  return rows[0] || null;
}

export async function getEntries(slug, { sampleOnly = false } = {}) {
  const sel = 'sort_order,name,title,firm,country,region,city,linkedin_url,email,website,extra';
  const filter = '';
  const out = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const res = await fetch(
      `${env('SUPABASE_URL')}/rest/v1/paid_list_entries?select=${sel}&slug=eq.${encodeURIComponent(slug)}${filter}&order=sort_order.asc`,
      {
        headers: {
          apikey: (process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SECRET_KEY')),
          Authorization: `Bearer ${(process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SECRET_KEY'))}`,
          Range: `${from}-${from + page - 1}`,
        },
      },
    );
    if (!res.ok) throw new Error(`Supabase entries ${slug} -> ${res.status}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return out;
}

export async function insertRow(table, row, { returning = false } = {}) {
  return sb(table, { method: 'POST', body: row, prefer: returning ? 'return=representation' : 'return=minimal' });
}

export async function updateRows(table, filter, patch) {
  return sb(`${table}?${filter}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
}

export async function selectRows(table, query) {
  return sb(`${table}?${query}`);
}

// ---------- CSV ----------
const COLS = [
  ['sort_order', '#'],
  ['name', 'Name'],
  ['title', 'Title'],
  ['firm', 'Firm'],
  ['email', 'Email'],
  ['linkedin_url', 'LinkedIn'],
  ['country', 'Country'],
  ['city', 'City'],
  ['region', 'Region'],
  ['website', 'Website'],
];

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(entries, list) {
  // Fund directories (climate VCs) carry their fields in `extra`.
  const extraKeys = [];
  for (const e of entries) if (e.extra) for (const k of Object.keys(e.extra)) if (!extraKeys.includes(k)) extraKeys.push(k);
  const extraLabel = { sector: 'Sector', stage: 'Stage', lead: 'Takes the lead', min: 'Min ticket (m EUR)', max: 'Max ticket (m EUR)' };
  const cols = COLS.filter(([k]) => entries.some((e) => e[k] !== null && e[k] !== undefined && e[k] !== ''));
  const header = [...cols.map(([, l]) => l), ...extraKeys.map((k) => extraLabel[k] || k)];
  const lines = [header.map(csvCell).join(',')];
  for (const e of entries) {
    lines.push([...cols.map(([k]) => csvCell(e[k])), ...extraKeys.map((k) => csvCell(e.extra?.[k]))].join(','));
  }
  return `﻿${list.name} (Climate Insiders Investor Lists)\n${lines.join('\n')}\n`;
}

// ---------- Resend ----------
export async function sendEmail({ to, subject, text, html, attachments = [], tags = [], headers }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('EMAIL_FROM', 'Yoann Berno <yoann@climateinsiders.com>'),
      to: [to],
      reply_to: env('EMAIL_REPLY_TO', 'yoann@climateinsiders.com'),
      subject,
      text,
      html,
      attachments: attachments.map((a) => ({ filename: a.filename, content: (Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content, 'utf8')).toString('base64') })),
      tags,
      ...(headers ? { headers } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend -> ${res.status} ${await res.text()}`);
  return res.json();
}

export function textToHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linkify = (s) => s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const paras = text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${linkify(esc(p)).replace(/\n/g, '<br>')}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${paras.join('')}</div>`;
}

// ---------- Stripe (REST, form-encoded) ----------
function formEncode(obj, prefix = '') {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => parts.push(formEncode(typeof item === 'object' ? item : { '': item }, `${key}[${i}]`)));
    else if (typeof v === 'object') parts.push(formEncode(v, key));
    else parts.push(`${encodeURIComponent(key.replace(/\[\]$/, ''))}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join('&');
}

export async function stripe(path, body) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? formEncode(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} -> ${res.status} ${json.error?.message || ''}`);
  return json;
}

// ---------- request helpers ----------
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRaw(req);
  return raw ? JSON.parse(raw) : {};
}

export function readRaw(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === 'string') return resolve(req.body);
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

// What has this email already paid for, and what would the bundle cost them now?
export async function upgradeQuote(token) {
  if (!token || !/^[a-f0-9]{16,64}$/.test(token)) return null;
  const [p] = await selectRows('list_purchases', `token=eq.${token}&select=email,created_at`);
  if (!p) return null;
  const all = await selectRows('list_purchases', `email=ilike.${encodeURIComponent(p.email)}&delivered_at=not.is.null&select=slugs,bundle,amount_cents,created_at&order=created_at.asc`);
  const bundleOwned = all.some((r) => r.bundle);
  const owned = [...new Set(all.flatMap((r) => r.slugs))];
  const paid = all.filter((r) => !r.bundle).reduce((a, r) => a + r.amount_cents, 0);
  const first = new Date(all[0]?.created_at || p.created_at);
  const expiresAt = new Date(first.getTime() + UPGRADE_DAYS * 86400000);
  const active = !bundleOwned && Date.now() < expiresAt.getTime();
  const price = active ? Math.max(BUNDLE_PRICE_CENTS - paid, MIN_UPGRADE_CENTS) : BUNDLE_PRICE_CENTS;
  return { email: p.email, owned, paid, bundleOwned, active, price, expiresAt: expiresAt.toISOString() };
}

export function fmtUsd(cents) {
  return `$${Math.round(cents / 100)}`;
}

// The Slack incoming-webhook URL, cleaned of the quotes/whitespace/newlines that copy-paste into Vercel often adds.
export function slackHook() {
  const raw = String(process.env.SLACK_WEBHOOK_URL || '').trim().replace(/^["']|["']$/g, '').trim();
  return raw || null;
}
