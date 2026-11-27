import { json, env, sendEmail } from './_lib.js';

// POST /api/join  -> investor community signup.
//
// Replaces the Typeform (naTjpR4B) that had been CLOSED since May 2025: it used
// an ending-screen redirect that fell outside the Typeform plan, so Typeform
// refused to publish it and quietly stopped accepting responses. Eighteen months
// of signups hit "you can't access this typeform" and were never recorded
// anywhere. This endpoint has no such failure mode: a bad write returns a real
// error to the browser and is logged.
//
// Writes to Airtable base appLZFv8yLM6DmF4V, table "Climate Insiders - Investor
// Community". Field names must match the base exactly. Airtable rejects the
// whole record if ANY field name is unknown, so unknown fields are stripped and
// the write is retried rather than losing the lead: the essentials always land
// even when the optional columns have not been added to the base yet.
//
// Substack: there is no API to subscribe someone. Writes are blocked as bot
// traffic. So "Newsletter consent" only RECORDS the intent; the actual
// subscribe happens when the person clicks through to the prefilled Substack
// page we hand back in `next`, or the link in their confirmation email.

const BASE = 'appLZFv8yLM6DmF4V';
const TABLE = 'Climate Insiders - Investor Community';
const SUBSTACK = 'https://climateinsiders.substack.com/subscribe';

const ok = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const clean = (s, max = 200) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

// This endpoint is public and sends mail to whatever address it is given, so it
// is guarded: same-site origins only, a small per-IP limit, and names that look
// like links are refused (the first name is echoed into the confirmation email).
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?climateinsiders\.com$|^https:\/\/ci-lists[a-z0-9-]*\.vercel\.app$/i;
const LINKISH = /(https?:|www\.|\/|@|<|>|[a-z0-9-]+\.(com|net|org|io|ru|cn|xyz|top|info|co)\b)/i;
const hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

// Second home for a lead when Airtable cannot take it. The signup this replaces
// failed silently for eighteen months, so a failed write is turned into an email
// to the owner that carries every answer.
async function emailLeadToOwner(fields, reason) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  await sendEmail({
    to: env('LEAD_FALLBACK_EMAIL', 'yoann@climateinsiders.com'),
    subject: `New investor signup (add to Airtable): ${fields['First Name']} ${fields['Last Name']}`,
    text: [
      'A new investor signed up, but the row could not be written to Airtable.',
      'Nothing is lost. Add it to "Climate Insiders - Investor Community" by hand, and fix the cause below.',
      '',
      ...lines,
      '',
      `Cause: ${reason}`,
    ].join('\n'),
    tags: [{ name: 'type', value: 'investor-fallback' }],
  });
}

async function airtableCreate(fields) {
  const key = env('AIRTABLE_API_KEY', '');
  if (!key) throw new Error('AIRTABLE_API_KEY missing');
  const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`;
  let payload = { ...fields };

  // Up to 8 attempts: each 422 UNKNOWN_FIELD_NAME names one column the base
  // does not have yet. Drop it and retry so a missing optional column can never
  // cost us the whole signup.
  for (let i = 0; i < 8; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: payload }], typecast: true }),
    });
    if (res.ok) return { record: await res.json(), dropped: Object.keys(fields).filter((k) => !(k in payload)) };

    const body = await res.text();
    const miss = body.match(/Unknown field name:\s*"?([^"}]+)"?/i);
    if (res.status === 422 && miss) {
      const field = miss[1].trim();
      if (field in payload) { delete payload[field]; continue; }
    }
    throw new Error(`airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  throw new Error('airtable: too many unknown fields');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGIN.test(origin)) return json(res, 403, { error: 'Not allowed from this site.' });

  try {
    const b = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');

    // Honeypot. Real people never fill a field they cannot see; bots fill
    // everything. Return 200 so the bot believes it succeeded and moves on.
    if (clean(b.company_website)) return json(res, 200, { ok: true });

    const email = clean(b.email, 200).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json(res, 400, { error: 'Enter a valid email address.' });
    if (!ok(b.first_name, 100)) return json(res, 400, { error: 'First name is required.' });
    if (!ok(b.last_name, 100)) return json(res, 400, { error: 'Last name is required.' });
    if (LINKISH.test(b.first_name) || LINKISH.test(b.last_name)) return json(res, 400, { error: 'Please enter just your name.' });
    if (b.gdpr !== true) return json(res, 400, { error: 'Please accept the terms to continue.' });

    if (limited(req)) return json(res, 429, { error: 'Too many attempts. Please try again in a few minutes.' });

    const targets = Array.isArray(b.targets) ? b.targets.map((t) => clean(t, 80)).filter(Boolean).slice(0, 12) : [];
    const motivations = Array.isArray(b.motivations) ? b.motivations.map((t) => clean(t, 80)).filter(Boolean).slice(0, 6) : [];
    const newsletter = b.newsletter === true;

    const fields = {
      'First Name': clean(b.first_name, 100),
      'Last Name': clean(b.last_name, 100),
      Email: email,
      Country: clean(b.country, 100),
      Phone: clean(b.phone, 40),
      'How much capital do you want to commit?': clean(b.ticket, 80),
      'Other amount': clean(b.ticket_other, 80),
      'What would be your ideal investing format?': clean(b.format, 80),
      'Main motivation to invest in Climate Tech Startup': motivations,
      'Investment targets': targets,
      'Open to secondaries': clean(b.secondaries, 40),
      'Newsletter consent': newsletter,
      'GDPR consent': true,
      Source: clean(b.source, 200) || 'lists.climateinsiders.com/join',
      'Submitted at': new Date().toISOString(),
    };
    for (const k of Object.keys(fields)) {
      const v = fields[k];
      if (v === '' || (Array.isArray(v) && !v.length)) delete fields[k];
    }

    let saved = 'airtable';
    try {
      const { dropped } = await airtableCreate(fields);
      if (dropped.length) console.warn('[join] base is missing columns, dropped:', dropped.join(', '));
    } catch (e) {
      console.error('[join] airtable write failed, emailing the lead instead:', e.message);
      await emailLeadToOwner(fields, e.message); // throws -> real error to the visitor
      saved = 'email';
    }

    const next = newsletter ? `${SUBSTACK}?email=${encodeURIComponent(email)}` : null;

    // The confirmation email is sent best-effort. A mail failure must never
    // turn a captured lead into an error page.
    let emailed = false;
    try {
      await sendEmail({
        to: email,
        subject: 'You are on the Climate Insiders investor list',
        text: investorText({ name: clean(b.first_name, 100), newsletter }),
        html: investorHtml({ name: clean(b.first_name, 100), newsletter, email }),
        tags: [{ name: 'type', value: 'investor-welcome' }],
      });
      emailed = true;
    } catch (e) {
      console.error('[join] confirmation email failed:', e.message);
    }

    return json(res, 200, { ok: true, next, saved, emailed });
  } catch (err) {
    console.error('[join]', err);
    return json(res, 500, { error: 'Something went wrong saving that. Please email yoann@climateinsiders.com and we will add you by hand.' });
  }
}

// Every link below points at something that already exists and is free to open.
// Nothing here promises a document we have not published.
const RESOURCES = [
  ['474 climate VCs, with the stage and cheque size each one writes', 'https://lists.climateinsiders.com/climate-vcs-474'],
  ['366 LPs who back climate funds', 'https://lists.climateinsiders.com/lps-366'],
  ['Every list we publish, by sector and by region', 'https://lists.climateinsiders.com/all'],
  ['The podcast: founders and investors on how deals actually got done', 'https://climateinsiders.co'],
];

function investorText({ name, newsletter }) {
  return [
    `Hi ${name},`,
    '',
    'You are on the Climate Insiders investor list. We will be in touch when the next round opens.',
    '',
    'While you wait, these are the most useful things we have published:',
    ...RESOURCES.map(([t, u]) => `  - ${t}\n    ${u}`),
    '',
    newsletter
      ? 'You asked for the newsletter. One last step, confirm it here: https://climateinsiders.substack.com/subscribe'
      : 'If you change your mind about the newsletter: https://climateinsiders.substack.com/subscribe',
    '',
    'Reply to this email if you want to talk before then. It comes straight to me.',
    '',
    'Yoann',
  ].join('\n');
}

function investorHtml({ name, newsletter, email }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = RESOURCES.map(
    ([t, u]) => `<li style="margin:0 0 10px"><a href="${esc(u)}" style="color:#1f1b16">${esc(t)}</a></li>`
  ).join('');
  const sub = `https://climateinsiders.substack.com/subscribe?email=${encodeURIComponent(email)}`;
  return `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;margin:0 auto;color:#1f1b16;line-height:1.5">
<p>Hi ${esc(name)},</p>
<p>You are on the Climate Insiders investor list. We will be in touch when the next round opens.</p>
<p style="margin-top:22px"><strong>While you wait, the most useful things we have published:</strong></p>
<ul style="padding-left:18px">${items}</ul>
${newsletter
  ? `<p style="margin-top:24px;padding:16px;background:#f4f6f4;border-radius:10px">You asked for the newsletter. It takes one click to confirm:<br>
<a href="${esc(sub)}" style="display:inline-block;margin-top:10px;background:#ff9a2b;color:#1f1b16;font-weight:600;padding:11px 20px;border-radius:999px;text-decoration:none">Confirm my subscription</a></p>`
  : `<p style="margin-top:24px;color:#3b3630;font-size:14px">Changed your mind about the newsletter? <a href="${esc(sub)}" style="color:#1f1b16">Subscribe here</a>.</p>`}
<p style="margin-top:24px">Reply to this email if you want to talk before then. It comes straight to me.</p>
<p>Yoann</p>
</div>`;
}
