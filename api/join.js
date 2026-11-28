import { randomUUID } from 'node:crypto';
import { json, env, isEmail } from './_lib.js';
import { sequence, render, CAL_INVESTOR, CAL_FOUNDER } from './_forms-mail.js';

// The single endpoint behind the website forms (investor, founder, contact).
// One function on purpose, so adding forms does not add serverless functions.
//
//   POST {action:'upload', filename, size}  -> signed URL to upload a pitch deck
//   POST {kind, ...fields}                  -> saves to Airtable, emails everyone
//   GET/POST ?stop=<ids>                    -> cancels scheduled follow-ups
//
// History: these replace Typeform. The old investor Typeform sat closed for
// eighteen months and nobody was told. So here a failed Airtable write becomes
// an email to the owner carrying every answer, and the owner is told about
// every submission either way.
//
// Substack has no subscribe API, so newsletter consent is recorded and the
// person gets a button to confirm it themselves.

const BASE = 'appLZFv8yLM6DmF4V';
const TABLES = {
  investor: { id: 'tbloLkPqh9WWdudee', label: 'investor signup' },
  founder: { id: 'tbl2q5Jh5rq5CQFiZ', label: 'founder pitch' },
  contact: { id: 'tblKf0QICEfVSpTqS', label: 'contact message' },
};
const BUCKET = 'ci-pitch-decks';
const SITE = 'https://lists.climateinsiders.com';
const SUBSTACK = 'https://climateinsiders.substack.com/subscribe';
const DECK_TYPES = { pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', key: 'application/vnd.apple.keynote', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
export const MAX_DECK = 25 * 1024 * 1024;

const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?climateinsiders\.com$|^https:\/\/ci-lists[a-z0-9-]*\.vercel\.app$/i;
const LINKISH = /(https?:|www\.|\/|@|<|>|[a-z0-9-]+\.(com|net|org|io|ru|cn|xyz|top|info|co)\b)/i;
const HARDLINK = /(https?:|www\.|\/\/|<|>)/i;
const hits = new Map();
function limited(req, max) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

class Bad extends Error {}
const one = (s, max = 200) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const many = (s, max = 4000) => String(s ?? '').replace(/\r/g, '').trim().slice(0, max);
const list = (a) => (Array.isArray(a) ? a.map((t) => one(t, 80)).filter(Boolean).slice(0, 20) : []);
function need(b, key, label, max = 200) { const v = one(b[key], max); if (!v) throw new Bad(`${label} is required.`); return v; }
function webUrl(v, label, required) {
  let s = one(v, 300);
  if (!s) { if (required) throw new Bad(`${label} is required.`); return ''; }
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try { const u = new URL(s); if (!u.hostname.includes('.')) throw 0; return u.href; } catch { throw new Bad(`${label} does not look like a web address.`); }
}
// "1.5m", "750k", "$2,000,000" -> number
export function money(v, label) {
  const m = String(v ?? '').toLowerCase().replace(/[$€£,\s]/g, '').match(/^(\d+(?:\.\d+)?)(k|m|mn|b|bn)?$/);
  if (!m) throw new Bad(`${label} should be a number, for example 750000 or 1.5m.`);
  return Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, mn: 1e6, b: 1e9, bn: 1e9 }[m[2]] || 1));
}

const sbUrl = () => `${env('SUPABASE_URL')}/storage/v1`;
async function storage(path, body, method = 'POST') {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SECRET_KEY');
  const res = await fetch(sbUrl() + path, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`storage ${path.split('?')[0]} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function uploadTicket(b) {
  const raw = one(b.filename, 160);
  const ext = (raw.split('.').pop() || '').toLowerCase();
  if (!DECK_TYPES[ext]) throw new Bad('Upload your deck as PDF, PowerPoint, Keynote or Word.');
  const size = Number(b.size);
  if (!Number.isFinite(size) || size <= 0) throw new Bad('That file looks empty.');
  if (size > MAX_DECK) throw new Bad('That file is over 25 MB. Export a smaller PDF and try again.');
  const safe = raw.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_').slice(-90) || `deck.${ext}`;
  const path = `web/${randomUUID()}/${safe}`;
  const out = await storage(`/object/upload/sign/${BUCKET}/${path}`, {});
  return { path, uploadUrl: sbUrl() + out.url, contentType: DECK_TYPES[ext] };
}

async function deckLink(path) {
  if (!/^web\/[0-9a-f-]{36}\/[\w.\-]{1,100}$/.test(path)) throw new Bad('Please attach your deck again.');
  try {
    const out = await storage(`/object/sign/${BUCKET}/${path}`, { expiresIn: 60 * 60 * 24 * 30 });
    const filename = path.split('/').pop();
    return { filename, url: `${sbUrl()}${out.signedURL}&download=${encodeURIComponent(filename)}` };
  } catch (e) {
    console.error('[join] deck not found:', e.message);
    throw new Bad('Your deck did not finish uploading. Please attach it again.');
  }
}

// Turns the posted form into Airtable fields plus what the emails need.
async function parse(kind, b) {
  const email = one(b.email).toLowerCase();
  if (!isEmail(email) || !/\.[^@\s]{2,}$/.test(email)) throw new Bad('Enter a valid email address.');
  if (b.gdpr !== true) throw new Bad('Please accept the terms to continue.');
  const newsletter = b.newsletter === true;
  const now = new Date().toISOString();
  const source = one(b.source) || `website ${kind} form`;

  if (kind === 'contact') {
    const name = need(b, 'name', 'Your name', 120);
    if (LINKISH.test(name)) throw new Bad('Please enter just your name.');
    const message = many(b.message);
    if (!message) throw new Bad('Please write your message.');
    return { email, newsletter, firstName: name.split(' ')[0], who: name, fields: {
      Name: name, Email: email, Category: need(b, 'category', 'A category', 40), Location: one(b.location, 80),
      LinkedIn: webUrl(b.linkedin, 'LinkedIn', false), 'Company URL': webUrl(b.company_url, 'Company website', false),
      'Partnership type': list(b.partnership_type), 'Investor type': list(b.investor_type), 'Investment stages': list(b.stages),
      Industries: list(b.industries), 'Investment thesis': one(b.thesis, 400), Role: list(b.role), Message: message,
      'Newsletter consent': newsletter, Source: source, 'Submitted at': now,
    } };
  }

  const firstName = need(b, 'first_name', 'First name', 100);
  const lastName = need(b, 'last_name', 'Last name', 100);
  if (LINKISH.test(firstName) || LINKISH.test(lastName)) throw new Bad('Please enter just your name.');

  if (kind === 'investor') {
    return { email, newsletter, firstName, who: `${firstName} ${lastName}`, fields: {
      'First Name': firstName, 'Last Name': lastName, Email: email, Country: one(b.country, 100), Phone: one(b.phone, 40),
      'How much capital do you want to commit?': one(b.ticket, 80), 'Other amount': one(b.ticket_other, 80),
      'What would be your ideal investing format?': one(b.format, 80),
      'Main motivation to invest in Climate Tech Startup': list(b.motivations),
      'Investment targets': list(b.targets), 'Open to secondaries': one(b.secondaries, 40),
      'Newsletter consent': newsletter, 'GDPR consent': true, Source: source, 'Submitted at': now,
    } };
  }

  const startup = need(b, 'startup', 'Startup name', 120);
  if (HARDLINK.test(startup)) throw new Bad('Please enter just the startup name.');
  const trl = Number(b.trl);
  if (!Number.isInteger(trl) || trl < 1 || trl > 9) throw new Bad('Pick a technology readiness level from 1 to 9.');
  const closing = one(b.closing_date, 10);
  const coaching = b.coaching === 'Yes';
  const fields = {
    Startup: startup, 'First Name': firstName, 'Last Name': lastName, Email: email, Country: need(b, 'country', 'Country', 100),
    'LinkedIn page': webUrl(b.linkedin, 'LinkedIn page', true), Website: webUrl(b.website, 'Website', true),
    Sector: need(b, 'sector', 'Sector', 120), Stage: need(b, 'stage', 'Stage', 40), TRL: trl,
    'Valuation (USD)': money(b.valuation, 'Valuation'), 'Raising (USD)': money(b.raising, 'Amount raising'),
    'Other investors': many(b.investors, 1500), 'Closing date': /^\d{4}-\d{2}-\d{2}$/.test(closing) ? closing : '',
    WhatsApp: one(b.whatsapp, 40), 'Wants pitch coaching': b.coaching === 'Yes' ? 'Yes' : 'No',
    'Agreed to terms': true, 'Newsletter consent': newsletter, Source: source, 'Submitted at': now,
  };
  const deck = await deckLink(one(b.deck_path, 220));
  fields['Pitch deck'] = [deck];
  fields['Deck storage path'] = one(b.deck_path, 220);
  return { email, newsletter, firstName, startup, coaching, deck, who: `${startup} (${firstName} ${lastName})`, fields };
}

async function airtableCreate(table, fields) {
  const key = env('AIRTABLE_API_KEY', '');
  if (!key) throw new Error('AIRTABLE_API_KEY missing');
  let payload = { ...fields };
  // A single unknown column makes Airtable reject the whole row, so drop it and
  // retry: schema drift can cost a column, never the lead.
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: payload }], typecast: true }),
    });
    if (res.ok) return { dropped: Object.keys(fields).filter((k) => !(k in payload)) };
    const body = await res.text();
    const miss = body.match(/Unknown field name:\s*\\?"([^"\\]+)/i);
    if (res.status === 422 && miss && miss[1] in payload) { delete payload[miss[1]]; continue; }
    throw new Error(`airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  throw new Error('airtable: too many unknown fields');
}

async function resend(message) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('EMAIL_FROM', 'Yoann Berno <yoann@climateinsiders.com>'), reply_to: env('EMAIL_REPLY_TO', 'yoann@climateinsiders.com'), ...message }),
  });
  if (!res.ok) throw new Error(`Resend -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function tellOwner(kind, d, saved, reason) {
  const lines = Object.entries(d.fields).filter(([k, v]) => k !== 'Pitch deck' && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  await resend({
    to: [env('LEAD_FALLBACK_EMAIL', 'yoann@climateinsiders.com')], reply_to: d.email,
    subject: saved ? `New ${TABLES[kind].label}: ${d.who}` : `New ${TABLES[kind].label} (add to Airtable): ${d.who}`,
    text: [
      saved ? `Saved in Airtable: https://airtable.com/${BASE}/${TABLES[kind].id}` : 'This could NOT be written to Airtable. Nothing is lost: add it by hand and fix the cause below.',
      '', ...(d.deck ? [`Pitch deck (link works for 30 days): ${d.deck.url}`, ''] : []), ...lines,
      ...(saved ? [] : ['', `Cause: ${reason}`]),
    ].join('\n'),
    tags: [{ name: 'type', value: `${kind}-owner` }],
  });
}

// Follow-ups are written and ready but stay off until CI_FOLLOWUPS=on.
// Latest first, so each earlier email can carry a link that cancels the later ones.
async function sendSequence(kind, d, newsletterUrl, followups = env('CI_FOLLOWUPS', 'off') === 'on') {
  const [first, ...rest] = sequence(kind, d);
  const later = [];
  if (followups) {
    for (const m of [...rest].reverse()) {
      try {
        const stopUrl = later.length ? `${SITE}/api/join?stop=${later.join('.')}` : '';
        const mail = render(m, stopUrl ? { stopUrl } : {});
        if (!stopUrl) mail.text += '\n\nReply "stop" if you would rather not hear from us.';
        const out = await resend({ to: [d.email], ...mail, scheduled_at: new Date(Date.now() + m.day * 86400000).toISOString(), tags: [{ name: 'type', value: `${kind}-followup` }] });
        later.push(out.id);
      } catch (e) { console.error('[join] follow-up not scheduled:', e.message); }
    }
  }
  const stopUrl = later.length ? `${SITE}/api/join?stop=${later.join('.')}` : '';
  await resend({ to: [d.email], ...render(first, { newsletterUrl, stopUrl }), tags: [{ name: 'type', value: `${kind}-welcome` }],
    ...(stopUrl ? { headers: { 'List-Unsubscribe': `<${stopUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}) });
}

async function stop(req, res, ids) {
  const valid = ids.split('.').filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 4);
  const page = (h, p, form) => {
    res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${h}</title><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f8f9fa;color:#1e1d30;display:grid;place-items:center;min-height:90vh;margin:0;padding:24px;text-align:center"><div><h1>${h}</h1><p>${p}</p>${form || ''}</div></body>`);
  };
  if (!valid.length) return page('That link did not work', 'Reply "stop" to any of our emails and we will take you off by hand.');
  // A button, not an automatic action: mail scanners open links on their own.
  if (req.method !== 'POST') return page('Stop the follow-up emails?', 'You will not receive the rest of this series.', '<form method="post"><button style="background:#ff9a2b;color:#fff;border:0;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:600;cursor:pointer">Yes, stop them</button></form>');
  let failed = 0;
  for (const id of valid) {
    const r = await fetch(`https://api.resend.com/emails/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}` } });
    if (!r.ok) { failed++; console.warn('[join] cancel', id, r.status, (await r.text()).slice(0, 150)); }
  }
  return page('Done', failed === valid.length ? 'There was nothing left to stop.' : 'No more emails in this series.');
}

export default async function handler(req, res) {
  const stopIds = new URL(req.url || '/', 'http://x').searchParams.get('stop');
  if (stopIds !== null) return stop(req, res, stopIds);

  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGIN.test(origin);
  if (allowed) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.statusCode = allowed ? 204 : 403; return res.end();
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (origin && !allowed) return json(res, 403, { error: 'Not allowed from this site.' });

  try {
    const b = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
    // Honeypot: people never see this field, bots fill it. Report success.
    if (one(b.company_website)) return json(res, 200, { ok: true });

    if (b.action === 'upload') {
      if (limited(req, 16)) return json(res, 429, { error: 'Too many attempts. Please try again in a few minutes.' });
      return json(res, 200, await uploadTicket(b));
    }
    const kind = b.kind === undefined ? 'investor' : String(b.kind);
    if (!Object.hasOwn(TABLES, kind)) return json(res, 400, { error: 'Unknown form.' });
    if (limited(req, 16)) return json(res, 429, { error: 'Too many attempts. Please try again in a few minutes.' });
    const d = await parse(kind, b);

    for (const k of Object.keys(d.fields)) { const v = d.fields[k]; if (v === '' || (Array.isArray(v) && !v.length)) delete d.fields[k]; }
    let saved = true, reason = '';
    try {
      const { dropped } = await airtableCreate(TABLES[kind].id, d.fields);
      if (dropped.length) console.warn('[join] missing columns, dropped:', dropped.join(', '));
    } catch (e) { saved = false; reason = e.message; console.error('[join] airtable write failed:', e.message); }
    try { await tellOwner(kind, d, saved, reason); }
    catch (e) {
      console.error('[join] owner email failed:', e.message);
      if (!saved) throw e; // neither home took it: the visitor must know
    }

    const next = d.newsletter ? `${SUBSTACK}?email=${encodeURIComponent(d.email)}` : null;
    let emailed = false;
    try { await sendSequence(kind, d, next); emailed = true; }
    catch (e) { console.error('[join] confirmation email failed:', e.message); }

    const calendar = kind === 'investor' ? CAL_INVESTOR : kind === 'founder' && d.coaching ? CAL_FOUNDER : null;
    return json(res, 200, { ok: true, saved: saved ? 'airtable' : 'email', emailed, next, calendar });
  } catch (err) {
    if (err instanceof Bad) return json(res, 400, { error: err.message });
    console.error('[join]', err);
    return json(res, 500, { error: 'Something went wrong saving that. Please email yoann@climateinsiders.com and we will add you by hand.' });
  }
}
