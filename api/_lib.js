// Shared helpers for the serverless functions. Zero dependencies: Stripe, Resend and
// Supabase are all called over plain HTTPS.

export const BUNDLE_PRICE_CENTS = 39000;
export const LIST_PRICE_CENTS = 9000;

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
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
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
  return sb('paid_lists?active=eq.true&order=sort_order.asc');
}

export async function getList(slug) {
  const rows = await sb(`paid_lists?slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`);
  return rows[0] || null;
}

export async function getEntries(slug, { sampleOnly = false } = {}) {
  const sel = 'sort_order,name,title,firm,country,region,city,linkedin_url,email,website,extra';
  const filter = sampleOnly ? '&is_sample=eq.true' : '';
  const out = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const res = await fetch(
      `${env('SUPABASE_URL')}/rest/v1/paid_list_entries?select=${sel}&slug=eq.${encodeURIComponent(slug)}${filter}&order=sort_order.asc`,
      {
        headers: {
          apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
          Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
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
export async function sendEmail({ to, subject, text, html, attachments = [], tags = [] }) {
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
      attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, 'utf8').toString('base64') })),
      tags,
    }),
  });
  if (!res.ok) throw new Error(`Resend -> ${res.status} ${await res.text()}`);
  return res.json();
}

export function textToHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linkify = (s) => s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" style="color:#0E3B2C">$1</a>');
  const paras = text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px">${linkify(esc(p)).replace(/\n/g, '<br>')}</p>`);
  return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">${paras.join('')}</div>`;
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

export function fmtUsd(cents) {
  return `$${Math.round(cents / 100)}`;
}
