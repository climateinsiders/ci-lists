import { ICONS, SMALL_ICONS } from './icons.mjs';

const SITE = 'https://lists.climateinsiders.com';
const UPSELL = 390;
const UPSELL_INVESTORS = 2426; // same as UNIQUE_INVESTORS: every unique investor across the 10 lists
const BUNDLE = 390;
const UNIQUE_INVESTORS = 2426; // unique across all lists; keep in sync with api/_lib.js
const AS = 'https://allstar-ci.vercel.app/p';
const WF = 'https://cdn.prod.website-files.com/657b1ee1812a034008e87de8';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x) => Number(x || 0).toLocaleString('en-US');
const pad = (i) => String(i).padStart(2, '0');
const usd = (c) => `$${Math.round(c / 100)}`;

// Each list has its own colour wash and ink.
const TONES = {
  'europe-500': ['#d9e6f2', '#2f5da8'],
  'usa-500': ['#ffe3cc', '#c2410c'],
  'uk-200': ['#e6e0f2', '#4c3a8a'],
  'dach-150': ['#e2e8e4', '#2f4f3f'],
  'nordics-150': ['#dcebe9', '#1f6f66'],
  'france-benelux-150': ['#ffe0e6', '#b3263f'],
  'apac-200': ['#fff1c2', '#9a6b00'],
  'latam-canada-150': ['#e3f0d8', '#2e7d32'],
  'lps-366': ['#efe5d2', '#6b4f1d'],
  'climate-vcs-474': ['#d8efe0', '#1b7a4a'],
};


// Flags: lipis/flag-icons SVGs (MIT), pinned version, served by jsDelivr. Round crops, no emoji (those do not render on Windows).
const FLAG = (code) => `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${code}.svg`;
const LIST_FLAGS = {
  'europe-500': ['eu'],
  'usa-500': ['us'],
  'uk-200': ['gb'],
  'dach-150': ['de', 'at', 'ch'],
  'nordics-150': ['se', 'dk', 'no', 'fi', 'is'],
  'france-benelux-150': ['fr', 'be', 'nl', 'lu'],
  'apac-200': ['sg', 'hk', 'au'],
  'latam-canada-150': ['ca', 'br', 'ar'],
};
const COUNTRY_ISO = Object.fromEntries(Object.entries({
  be: 'belgium', fr: 'france', de: 'germany', ch: 'switzerland', at: 'austria', nl: 'netherlands|the netherlands|holland', lu: 'luxembourg',
  gb: 'united kingdom|uk|england|scotland|wales|great britain', ie: 'ireland', es: 'spain', pt: 'portugal', it: 'italy',
  se: 'sweden', dk: 'denmark', no: 'norway', fi: 'finland', is: 'iceland', pl: 'poland', cz: 'czech republic|czechia', sk: 'slovakia',
  hu: 'hungary', ro: 'romania', bg: 'bulgaria', gr: 'greece', tr: 'turkey|türkiye', ee: 'estonia', lv: 'latvia', lt: 'lithuania',
  hr: 'croatia', si: 'slovenia', rs: 'serbia', mt: 'malta', cy: 'cyprus', mc: 'monaco', li: 'liechtenstein', ua: 'ukraine', ru: 'russia',
  je: 'jersey', gg: 'guernsey', im: 'isle of man',
  us: 'united states|usa|us|united states of america', ca: 'canada', mx: 'mexico', br: 'brazil', ar: 'argentina', cl: 'chile', co: 'colombia',
  pe: 'peru', uy: 'uruguay', bo: 'bolivia', pa: 'panama', cr: 'costa rica', do: 'dominican republic', ky: 'cayman islands', bm: 'bermuda', bs: 'bahamas',
  sg: 'singapore', hk: 'hong kong', au: 'australia', nz: 'new zealand', jp: 'japan', cn: 'china', kr: 'south korea|korea', in: 'india',
  id: 'indonesia', my: 'malaysia', th: 'thailand', vn: 'vietnam', ph: 'philippines', tw: 'taiwan',
  ae: 'united arab emirates|uae', sa: 'saudi arabia', qa: 'qatar', kw: 'kuwait', bh: 'bahrain', il: 'israel', eg: 'egypt', za: 'south africa', ke: 'kenya', ng: 'nigeria',
}).flatMap(([code, names]) => names.split('|').map((nm) => [nm, code])));
const isoFor = (country) => COUNTRY_ISO[String(country || '').trim().toLowerCase()] || null;

const flagImg = (code, cls = 'fl') => `<img class="${cls}" src="${FLAG(code)}" alt="" width="40" height="40" decoding="async" onerror="this.remove()">`;
const flagStack = (codes, cls = 'flags') => `<span class="${cls}" aria-hidden="true">${codes.map((c) => flagImg(c)).join('')}</span>`;

// Social proof from climateinsiders.com/all-star-yoann (Yoann's own page).
const PROOF = {
  logos: [
    ['Entocycle', `${WF}/6ab7e72f6c51a06a273a06ed_allstar-logo-entocycle.png`],
    ['Anodyne Chemistries', `${WF}/6ab7e730e48381cd33966297_allstar-logo-anodyne.png`],
    ['New Iridium', `${WF}/6ab7e7303df629b7afbaed3a_allstar-logo-newiridium.png`],
    ['Strong By Form', `${WF}/6ab7e7303df629b7afbaed58_allstar-logo-strongbyform.png`],
    ['Hephaestus', `${WF}/6ab7e730e5d9f17124f7be42_allstar-logo-hephaestus.png`],
    ['Novobiom', `${WF}/6ab7e73043a1ff6008c7103a_allstar-logo-novobiom.png`],
  ],
  quotes: [
    { who: 'Keiran Whitaker', role: 'Founder, Entocycle', round: '$5M Series A', photo: `${AS}/f-keiran-160.webp`, text: "I don't think we would have been able to close our Series A without Yoann. His network in the climate sector is unparalleled." },
    { who: 'Jack Zamattio', role: 'Founder, Hephaestus Fusion', round: 'Pre-seed closed', photo: `${AS}/f-jack-160.webp`, text: 'His extensive network in the climate sector is like a golden ticket to all major funds.' },
    { who: 'Chern-Hooi Lim', role: 'CEO, New Iridium', round: '$2.65M Seed', photo: `${AS}/f-chern-160.webp`, text: 'Our seed success story is closely tied to Climate Insiders and his exceptional network within the climate tech domain.' },
    { who: 'Andres Mitnik', role: 'Founder, Strong By Form', round: 'Seed, 10 investors', photo: `${AS}/f-andres-160.webp`, text: 'Within less than two months he connected us with some of the top investors in the industry.' },
  ],
};

function domainOf(e) {
  const w = (e.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (w && w.includes('.')) return w.toLowerCase();
  if (e.email && e.email.includes('@')) {
    const d = e.email.split('@')[1].toLowerCase();
    if (!/gmail|outlook|hotmail|yahoo|icloud|protonmail|me\.com/.test(d)) return d;
  }
  return null;
}

function initials(s) {
  return (s || '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

// Photo first, then the firm logo, then the firm favicon, then initials.
function face(e, size) {
  const fallback = `this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initials(e.name || e.firm))}'}))`;
  if (e.photo_url) return `<img src="${esc(e.photo_url)}" alt="" loading="lazy" onerror="${fallback}">`;
  if (e.logo_url) return `<img class="logo" src="${esc(e.logo_url)}" alt="" loading="lazy" onerror="${fallback}">`;
  const d = domainOf(e);
  if (d) return `<img class="logo" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}" alt="" loading="lazy" onerror="${fallback}">`;
  return `<span>${esc(initials(e.firm || e.name))}</span>`;
}

function maskEmail(e) {
  if (!e) return '';
  const [u, d] = e.split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(3, Math.min(6, u.length - 2)))}@${d}`;
}

export function shell({ title, description, body, canonical, ogTitle, ogImage, extraHead = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage || `${SITE}/og.png`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/658538a0538bd8c8a8da2e34_fav-sm.jpg" type="image/jpeg">
<link rel="apple-touch-icon" href="https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/6585389a7f43d48ed7b3c851_fav-md.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fraunces:opsz,wght@9..144,900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
${extraHead}
</head>
<body>
<div class="wrap">
${body}
${footer()}
</div>
<dialog class="preview paydlg" id="pay" aria-label="Secure checkout">
  <div class="pvhead"><span class="script">secure checkout</span><h2>Pay with Stripe</h2><button class="close" type="button" data-close aria-label="Close">×</button></div>
  <div class="paybody"><div id="checkout"><p class="loading">Opening secure checkout…</p></div></div>
</dialog>
<div id="toast" class="toast" role="status"></div>
<script src="/app.js" defer></script>
</body>
</html>`;
}

function brand() {
  return `<a class="brand" href="/"><img src="/yoann.jpg" alt="" width="44" height="44"><span>Climate Insiders</span></a>`;
}

function footer() {
  return `<footer class="foot">
  <span>© Climate Insiders</span>
  <span><a href="/terms">Terms and privacy</a> · <a href="https://climateinsiders.com">climateinsiders.com</a></span>
</footer>`;
}

function toneAttr(list) {
  const [bg, ink] = TONES[list.slug] || ['#e8dcc6', '#1f1b16'];
  return `style="--tone:${bg};--tone-ink:${ink}"`;
}

// The card is a small version of the LinkedIn poster. When `image_url` is set, that poster is shown instead.
export function card(list, i, { featured = false, open = false } = {}) {
  const faces = (list.sample || []).slice(0, 3).map((e) => `<span class="face">${face(e, 64)}</span>`).join('');
  const [first, ...rest] = list.card_name.split(' ');
  const art = list.image_url
    ? `<img class="poster" src="${esc(list.image_url)}" alt="${esc(list.name)}">`
    : `<span class="poster-html">
        <span class="eyebrow"><b>${esc(list.short_name)}</b></span>
        <span class="count">${esc(list.count_label)}</span>
        <span class="headline"><span class="hl">${esc(first)}</span> ${esc(rest.join(' '))}</span>
        <span class="art">${ICONS[list.icon] || ICONS.globe}</span>
        <span class="faces">${faces}</span>
      </span>`;
  return `<button class="card${featured ? ' featured' : open ? ' open' : ' locked'}" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog" aria-label="${esc(list.name)}">
  <span class="tape"></span>
  <span class="num">${pad(i + 1)}</span>
  ${featured || open ? '' : `<span class="lock" title="Buy to unlock">${SMALL_ICONS.lock}</span>`}
  <span class="owned">yours</span>
  ${art}
  <span class="cta">${featured || open ? `<span class="price">${usd(list.price_cents)}</span><span class="btn">See the top 10</span>` : `<span class="peek">See the top 10 →</span>`}</span>
</button>`;
}

function picks(list) {
  const isFund = list.slug === 'climate-vcs-474';
  return (list.sample || [])
    .slice(0, 10)
    .map((e) => {
      const x = e.extra || {};
      const line2 = isFund ? [e.region, x.stage].filter(Boolean).join(' · ') : [e.title, e.firm].filter(Boolean).join(' · ');
      const line3 = isFund ? x.sector || '' : e.email ? `<code>${esc(maskEmail(e.email))}</code>` : [e.city, e.country].filter(Boolean).join(', ');
      const iso = isFund ? null : isoFor(e.country);
      return `<li class="pick"><span class="avwrap"><span class="avatar">${face(e, 64)}</span>${iso ? flagImg(iso, 'flagb') : ''}</span><span class="who"><b>${esc(isFund ? e.firm : e.name)}</b><span>${esc(line2)}</span><span>${line3}</span></span></li>`;
    })
    .join('');
}

function valuePoints(list) {
  const pts = list.value_points || [];
  return `<ul class="checks">${pts.map((t) => `<li>${SMALL_ICONS.check}<span>${esc(t.replace('CSV + Airtable', 'Airtable + Excel'))}</span></li>`).join('')}</ul>`;
}

function quote(i) {
  const q = PROOF.quotes[i % PROOF.quotes.length];
  return `<figure class="quote"><img src="${q.photo}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><blockquote>“${esc(q.text)}”</blockquote><figcaption><b>${esc(q.who)}</b> · ${esc(q.role)} · <em>${esc(q.round)}</em></figcaption></figure>`;
}

const WORDMARKS = `
  <span class="wm g"><b style="color:#4285F4">G</b><b style="color:#EA4335">o</b><b style="color:#FBBC04">o</b><b style="color:#4285F4">g</b><b style="color:#34A853">l</b><b style="color:#EA4335">e</b></span>
  <span class="wm ms"><i class="sq"><i style="background:#F25022"></i><i style="background:#7FBA00"></i><i style="background:#00A4EF"></i><i style="background:#FFB900"></i></i>Microsoft</span>
  <span class="wm accel">Accel</span>
  <span class="wm yc"><i>Y</i>Combinator</span>
  <span class="wm seq">Sequoia</span>`;

function proofStrip() {
  const faces = PROOF.quotes.map((q) => `<img src="${q.photo}" alt="" loading="lazy" onerror="this.remove()">`).join('');
  const quotes = PROOF.quotes
    .map((q, i) => `<figure class="rq${i === 0 ? ' on' : ''}"><blockquote>“${esc(q.text)}”</blockquote><figcaption><b>${esc(q.who)}</b>, ${esc(q.role)} · <em>${esc(q.round)}</em></figcaption></figure>`)
    .join('');
  return `<section class="proof">
  <div class="left">
    <div class="stat"><span class="faces">${faces}</span><span><b>1,654 founders · $148M+ raised</b><small>with the investor data behind these lists</small></span></div>
    <div class="raised"><small>They raised from</small><span class="wms">${WORDMARKS}</span></div>
  </div>
  <div class="rotator" aria-live="polite">${quotes}</div>
</section>`;
}

// How the list is named in "you asked for ..." (the database short name reads badly for two lists).
const KICKER_NAME = { 'lps-366': 'LPs', 'climate-vcs-474': 'Climate VCs' };

const CHIP_NAME = { 'usa-500': 'US', 'uk-200': 'UK', 'france-benelux-150': 'France + Benelux', 'apac-200': 'APAC', 'latam-canada-150': 'Canada + LatAm', 'lps-366': 'LPs', 'climate-vcs-474': 'Climate VCs' };

function chip(list) {
  const flags = LIST_FLAGS[list.slug];
  const label = list.name;
  if (flags) {
    return `<button class="chip flagchip" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog" aria-label="${esc(label)}" title="${esc(list.card_name)}">${flagStack(flags.slice(0, 4), 'flags sm')}<span class="t"><b>${esc(list.count_label)}</b></span></button>`;
  }
  return `<button class="chip" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog" aria-label="${esc(label)}"><span class="dot">${ICONS[list.icon] || ICONS.globe}</span><span class="t"><b>${esc(list.count_label)}</b> ${esc(CHIP_NAME[list.slug] || list.short_name)}</span></button>`;
}

function statRow(list) {
  const st = list.stats || {};
  const isFund = list.slug === 'climate-vcs-474';
  const items = [
    [n(st.rows), isFund ? 'funds' : 'names'],
    st.emails && !isFund ? [n(st.emails), 'direct emails'] : null,
    st.firms ? [n(st.firms), isFund ? 'firms' : 'firms and offices'] : null,
    st.countries ? [n(st.countries), 'countries'] : null,
  ].filter(Boolean);
  return `<ul class="stats">${items.map(([v, l]) => `<li><b>${v}</b> ${l}</li>`).join('')}</ul>`;
}

function bundleBar(lists) {
  const full = lists.reduce((a, l) => a + l.price_cents / 100, 0);
  const total = lists.reduce((a, l) => a + (l.stats.rows || 0), 0);
  return `<div class="bundle" id="all">
  <span class="tag">best value</span>
  <span class="txt"><b id="bundle-price">All ${lists.length} lists, $${BUNDLE}</b> <s>$${full}</s><small id="bundle-sub">${n(UNIQUE_INVESTORS)} investors, hand-checked and up to date. Every region, the LPs and the climate funds.</small></span>
  <button class="btn" data-buy="all">Get all ${lists.length}</button>
</div>`;
}

// The offer: top 10 on the left, the value stack and the buy button on the right.
function offerBlock(list, { sheet = false } = {}) {
  const isFund = list.slug === 'climate-vcs-474';
  return `<div class="picksCol">
    <div class="head"><h3>Top 10 picks<span class="script">straight from the sheet</span></h3>${sheet ? `<button class="viewall" type="button" data-sheet>View all ${n(list.stats.rows)} <span aria-hidden="true">↗</span></button>` : `<small>${n(list.stats.rows)} in the full list</small>`}</div>
    <ul class="picks">${picks(list)}</ul>
    <p class="more">… and ${n(Math.max(0, list.stats.rows - 10))} more with the full ${isFund ? 'details' : (list.stats.emails || 0) / Math.max(1, list.stats.rows || 1) >= 0.4 ? 'emails and LinkedIn' : 'names, firms and roles'}.</p>
  </div>
  <div class="valueCol">
    <div class="buy">
      <div class="bigprice">${usd(list.price_cents)}<small>one time · yours forever</small></div>
      <button class="btn big" data-buy="${esc(list.slug)}">Get the list</button>
    </div>
    <p class="fine">Stripe checkout. Card, Apple Pay, Google Pay. Airtable + Excel by email in 2 minutes, receipt and invoice included.</p>
    <span class="script">what you get</span>
    ${valuePoints(list)}
  </div>`;
}

function preview(list) {
  return `<dialog class="preview" id="p-${esc(list.slug)}" aria-label="${esc(list.name)}">
  <div class="pvhead"><span class="script">${esc(list.short_name)}</span><h2>${esc(list.name)}</h2><button class="close" type="button" data-close aria-label="Close">×</button></div>
  <section class="offer" ${toneAttr(list)}>${offerBlock(list)}</section>
</dialog>`;
}

// Spreadsheet preview. The first OPEN_ROWS rows show real name, photo, title, firm and country.
// After that, surname and firm are replaced by blurred placeholders, so the page can't be scraped
// into the product. Email and LinkedIn are always placeholders, never the data.
const OPEN_ROWS = 20;
const BLUR = {
  email: ['firstname@familyoffice.com', 'name@capitalpartners.eu', 'info.direct@holdings.com', 'first.last@wealth.com'],
  linkedin: ['linkedin.com/in/firstname-lastname', 'linkedin.com/in/name-surname-42'],
  surname: ['Lastname', 'Surname', 'Familyname', 'Name'],
  sector: ['Energy, Mobility, Industry', 'Food and agritech, Materials', 'Climate software, Energy'],
  ticket: ['€1–8m', '€2–10m', '€0.5–5m'],
  lead: ['Yes', 'No'],
  firm: ['Family Office Holding', 'Capital Partners AG', 'Private Investments SA', 'Family Capital Ltd', 'Heritage Holdings'],
};
const bl = (k, i) => `<span class="blur">${BLUR[k][i % BLUR[k].length]}</span>`;

function fundSheetDialog(list) {
  const rows = (list.rows || []).map((r, i) => {
    const x = r.extra || {};
    const open = i < OPEN_ROWS;
    const name = r.firm || r.name || '';
    const nameCell = open ? esc(name) : bl('firm', i);
    const avatar = open ? face({ ...r, name }, 48) : face({ name }, 48);
    // min/max come as plain numbers (millions of EUR) for most funds, as free text ("$30m - $50m") for some.
    const isNum = (v) => /^\d+(\.\d+)?$/.test(String(v ?? '').trim());
    const ticket = isNum(x.min) && isNum(x.max) ? `€${esc(x.min)}–${esc(x.max)}m` : esc([x.min, x.max].find((v) => v && !isNum(v)) || (x.min ? `from €${x.min}m` : x.max ? `up to €${x.max}m` : ''));
    return `<tr><td class="ix">${i + 1}</td><td class="nm"><span class="av">${avatar}</span>${nameCell}</td><td>${esc(x.stage || '')}</td><td>${esc(r.region || '')}</td><td>${open ? esc(x.sector || '') : bl('sector', i)}</td><td>${open ? ticket : bl('ticket', i)}</td><td>${open ? esc(x.lead || '') : bl('lead', i)}</td></tr>`;
  });
  return `<dialog class="preview sheetdlg" id="sheet" aria-label="All ${n(list.stats.rows)} funds">
  <div class="pvhead"><span class="script">the full list</span><h2>${n(list.stats.rows)} funds. The first ${OPEN_ROWS} in full, the rest unlock when you buy.</h2><button class="close" type="button" data-close aria-label="Close">×</button></div>
  <div class="grid-wrap"><table class="sheettbl funds"><thead><tr><th class="ix">#</th><th>Fund</th><th>Stage</th><th>Region</th><th>Sector</th><th>Ticket</th><th>Leads rounds</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
  <div class="pvfoot"><span>Fund names, sectors, ticket sizes and who leads unlock when you buy.</span><button class="btn" data-buy="${esc(list.slug)}">Unlock all ${n(list.stats.rows)} for ${usd(list.price_cents)}</button></div>
</dialog>`;
}

function sheetDialog(list) {
  if (list.slug === 'climate-vcs-474') return fundSheetDialog(list);
  const rows = (list.rows || []).map((r, i) => {
    const label = r.name || r.firm || '';
    const x = r.extra || {};
    const open = i < OPEN_ROWS;
    const first = String(label).split(/\s+/)[0] || '';
    const nameCell = open ? esc(label) : r.name ? `${esc(first)} ${bl('surname', i)}` : bl('firm', i);
    const avatar = open ? face({ ...r, name: label }, 48) : face({ name: label }, 48);
    const firmCell = r.name ? (open ? esc(r.firm || '') : bl('firm', i)) : '';
    return `<tr><td class="ix">${i + 1}</td><td class="nm"><span class="av">${avatar}</span>${nameCell}</td><td>${esc(r.title || x.stage || '')}</td><td>${firmCell}</td><td class="ct">${isoFor(r.country) ? flagImg(isoFor(r.country), 'flagc') : ''}${esc(r.country || r.region || '')}</td><td>${bl('email', i)}</td><td>${bl('linkedin', i)}</td></tr>`;
  });
  return `<dialog class="preview sheetdlg" id="sheet" aria-label="All ${n(list.stats.rows)} rows">
  <div class="pvhead"><span class="script">the full list</span><h2>${n(list.stats.rows)} rows. The first ${OPEN_ROWS} in full, the rest unlock when you buy.</h2><button class="close" type="button" data-close aria-label="Close">×</button></div>
  <div class="grid-wrap"><table class="sheettbl"><thead><tr><th class="ix">#</th><th>Name</th><th>Title</th><th>Firm</th><th>Country</th><th>Email</th><th>LinkedIn</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
  <div class="pvfoot"><span>Full names, firms, direct emails and LinkedIn profiles unlock when you buy.</span><button class="btn" data-buy="${esc(list.slug)}">Unlock all ${n(list.stats.rows)} for ${usd(list.price_cents)}</button></div>
</dialog>`;
}

// One page, one offer: the featured list ($90). The other lists are chips that open the same offer in a dialog.
export function page(lists, featured) {
  const f = lists.find((l) => l.slug === featured) || lists[0];
  const others = lists.filter((l) => l !== f);
  const body = `
<header class="hero" ${toneAttr(f)}>
  <div class="title">
    ${brand()}
    <div class="kick"><span class="script">${featured ? `you asked for ${esc(KICKER_NAME[f.slug] || f.short_name)}. here it is.` : 'hey, founders and fund managers'}</span></div>
    <h1>${LIST_FLAGS[f.slug] ? flagStack(LIST_FLAGS[f.slug], 'flags lg') : `<span class="flags lg" aria-hidden="true"><span class="fl iconfl">${ICONS[f.icon] || ICONS.globe}</span></span>`}<span class="hl">${esc(f.name)}</span></h1>
  </div>
</header>

<section class="offer main" id="offer" ${toneAttr(f)}>${offerBlock(f, { sheet: true })}</section>

<section class="chips"><span class="lbl">+ ${others.length} more lists</span><span class="row">${others.slice(0, 6).map(chip).join('')}</span></section>
${proofStrip()}
${others.map(preview).join('\n')}
${sheetDialog(f)}`;
  const title = featured ? `${f.name} · Climate Insiders` : 'Investor lists for founders and fund managers · Climate Insiders';
  const description = `${f.tagline} ${n(f.stats.rows)} rows. ${usd(f.price_cents)} one time, delivered by email.`;
  return shell({
    title,
    description,
    canonical: featured ? `${SITE}/${f.slug}` : `${SITE}/`,
    ogImage: f.image_url || undefined,
    body,
  });
}

// The grand slam offer: a stack of what they get, then one button.
function slamCard() {
  const item = (name, sub) => `<li><span class="ck">${SMALL_ICONS.check}</span><span><b>${name}</b><small>${sub}</small></span><em>included</em></li>`;
  return `<div class="slam">
  <span class="tag">buyers only · one-time offer</span>
  <h2>Get <span class="hl">all ${n(UPSELL_INVESTORS)} investors</span> from everywhere.</h2>
  <ul class="stack">
    ${item(`All ${n(UPSELL_INVESTORS)} investors`, `Every region, hand-checked and deduplicated.`)}
    ${item('Cold outreach kit', 'Everything you need to write to them.')}
    ${item('Fundraising kit', 'Everything you need to run the raise.')}
    ${item('Airtable + Excel, free fixes', 'Delivered like your first list. Wrong row? Reply, I fix it.')}
    ${item('1 year of the Climate Insiders newsletter', 'Read by 22,000+ readers.')}
  </ul>
  <div class="clock" data-clock><span class="digits"><b data-h>24</b>:<b data-m>00</b>:<b data-s>00</b></span><small>left to claim this. Buyers only, shown once, then it is gone.</small></div>
  <button class="btn big" data-upsell>Yes, give me everything · $${UPSELL}</button>
  <p class="fine" data-expired hidden>This offer has closed.</p>
</div>`;
}

// /all keeps the original card + side-by-side preview dialog (styled by all.css).
function legacyPreview(list, i) {
  const isFund = list.slug === 'climate-vcs-474';
  return `<dialog class="preview" id="p-${esc(list.slug)}" data-slug="${esc(list.slug)}" aria-labelledby="t-${esc(list.slug)}">
<div class="sheet" ${toneAttr(list)}>
  <button class="close" type="button" data-close aria-label="Close">×</button>
  <div class="left">
    <span class="script">${esc(list.short_name)}</span>
    <h2 id="t-${esc(list.slug)}">${esc(list.name)}</h2>
    ${valuePoints(list)}
    <div class="bigprice">${usd(list.price_cents)}<small>one time · yours forever</small></div>
    <button class="btn big" data-buy="${esc(list.slug)}">Buy this list</button>
    <p class="fine">Stripe checkout. Card, Apple Pay, Google Pay. Receipt and invoice by email. Or all 10 for $${BUNDLE}: <a href="#" data-buy="all">get the bundle</a>.</p>
  </div>
  <div class="right">
    <div class="head"><h3>Top 10 picks<span class="script">straight from the sheet</span></h3><small>${n(list.stats.rows)} in the full list</small></div>
    <ul class="picks">${picks(list)}</ul>
    <p class="more">… and ${n(Math.max(0, list.stats.rows - 10))} more with the full ${isFund ? 'details' : 'emails and LinkedIn'}.</p>
    ${quote(i)}
  </div>
</div>
</dialog>`;
}

// /all: every list as a card, the bundle up top. Upsell emails land here (?u=<token> turns on upgrade pricing).
export function allPage(lists) {
  const body = `
<header class="topbar">${brand()}</header>
<section class="hero">
  <div>
    <span class="script" id="all-kicker">all ten, side by side</span>
    <h1>Every <span class="hl">investor list</span>.</h1>
  </div>
  ${bundleBar(lists)}
</section>
<section class="grid all" id="lists">
${lists.map((l, i) => card(l, i, { open: true })).join('\n')}
</section>
${proofStrip()}
${lists.map((l, i) => legacyPreview(l, i)).join('\n')}`;
  return shell({
    title: 'All 10 investor lists · Climate Insiders',
    description: `${n(UNIQUE_INVESTORS)} investors across 10 lists: family offices in every region, LPs and climate VC funds. $${BUNDLE} for all ten.`,
    canonical: `${SITE}/all`,
    body,
    extraHead: '<meta name="x-page" content="all"><link rel="stylesheet" href="/all.css">',
  });
}

export function thanksPage() {
  const body = `
<header class="hero">
  <div class="title">
    ${brand()}
    <span class="script">paid. thank you.</span>
    <h1><span class="hl">You're in.</span></h1>
  </div>
</header>

<section class="offer main after" id="after">
  <div class="picksCol">
    <div class="head"><h3>Your list is ready<span class="script">yours for good</span></h3><small id="sentto">also emailed to you</small></div>
    <ul class="mylists" id="mylists"><li class="ph">Loading your list…</li></ul>
    <div class="next">
      <span class="script">three rules before you write to anyone</span>
      <ol>
        <li><b>Filter first.</b> Pick the twelve that fit your sector and stage. Twelve well-matched names beat five hundred cold ones.</li>
        <li><b>One email per person,</b> under 110 words, one specific line about them. A short second note 4 to 5 days later.</li>
        <li><b>Book the flight.</b> The Nordics reply to email. France, Benelux and DACH reply to a coffee.</li>
      </ol>
    </div>
    <div class="proofs"><div class="raised"><small>They raised from</small><span class="wms">${WORDMARKS}</span></div><div class="pair">${quote(0)}${quote(2)}</div></div>
  </div>
  <div class="valueCol slamCol" id="slamcol">${slamCard()}</div>
</section>

<p class="thanks-small small">Nothing after ten minutes? Email <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a> with your receipt.</p>
<canvas id="confetti" aria-hidden="true"></canvas>`;
  return shell({ title: 'You are in · Climate Insiders Investor Lists', description: 'Your list is ready.', canonical: `${SITE}/thanks`, body });
}

// After the $390 grand slam offer: confirmation and direct access to everything they bought.
export function welcomePage() {
  const body = `
<header class="hero">
  <div class="title">
    ${brand()}
    <span class="script">paid. thank you.</span>
    <h1><span class="hl">You have everything.</span></h1>
  </div>
</header>

<section class="offer main after" id="welcome" data-investors="${n(UPSELL_INVESTORS)}">
  <div class="picksCol">
    <div class="head"><h3>Your full access<span class="script">yours for good</span></h3><small id="sentto">also emailed to you</small></div>
    <ul class="mylists" id="access"><li class="ph">Loading your access…</li></ul>
    <div class="proofs"><div class="raised"><small>They raised from</small><span class="wms">${WORDMARKS}</span></div><div class="pair">${quote(0)}${quote(2)}</div></div>
  </div>
  <div class="valueCol slamCol">
    <div class="slam">
      <span class="tag">offer unlocked</span>
      <h2>All <span class="hl">${n(UPSELL_INVESTORS)} investors</span> from everywhere are yours.</h2>
      <ul class="stack">
        <li><span class="ck">${SMALL_ICONS.check}</span><span><b>All ${n(UPSELL_INVESTORS)} investors</b><small>Every region. Open it on the left.</small></span><em>yours</em></li>
        <li><span class="ck">${SMALL_ICONS.check}</span><span><b>Cold outreach kit</b><small>Everything you need to write to them.</small></span><em>yours</em></li>
        <li><span class="ck">${SMALL_ICONS.check}</span><span><b>Fundraising kit</b><small>Everything you need to run the raise.</small></span><em>yours</em></li>
        <li><span class="ck">${SMALL_ICONS.check}</span><span><b>1 year of the newsletter</b><small>Read by 22,000+ readers.</small></span><em>yours</em></li>
      </ul>
      <div class="next start">
        <span class="script">start here</span>
        <ol>
          <li><b>Open the database</b> and filter by your sector and stage before anything else.</li>
          <li><b>Write to twelve, not five hundred.</b> One email per person, one specific line about them.</li>
          <li><b>Wrong row?</b> Reply to any email from me and I fix it. Free, forever.</li>
        </ol>
      </div>
    </div>
  </div>
</section>

<p class="thanks-small small">Anything missing? Email <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a> with your receipt.</p>
<canvas id="confetti" aria-hidden="true"></canvas>`;
  return shell({ title: 'You have everything · Climate Insiders Investor Lists', description: 'Your full access.', canonical: `${SITE}/welcome`, body });
}
