import { ICONS, SMALL_ICONS } from './icons.mjs';

const SITE = 'https://lists.climateinsiders.com';
const UPSELL = 250;
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
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
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
<div id="toast" class="toast" role="status"></div>
<script src="/app.js" defer></script>
</body>
</html>`;
}

function brand() {
  return `<a class="brand" href="/"><img src="/yoann.jpg" alt="" width="38" height="38"><span>Climate Insiders<small>Investor lists</small></span></a>`;
}

function footer() {
  return `<footer class="foot">
  <span>© Climate Insiders</span>
  <span><a href="https://climateinsiders.com">climateinsiders.com</a></span>
</footer>`;
}

function toneAttr(list) {
  const [bg, ink] = TONES[list.slug] || ['#e8dcc6', '#1f1b16'];
  return `style="--tone:${bg};--tone-ink:${ink}"`;
}

function picks(list) {
  const isFund = list.slug === 'climate-vcs-474';
  return (list.sample || [])
    .slice(0, 10)
    .map((e) => {
      const x = e.extra || {};
      const line2 = isFund ? [e.region, x.stage].filter(Boolean).join(' · ') : [e.title, e.firm].filter(Boolean).join(' · ');
      const line3 = isFund ? x.sector || '' : e.email ? `<code>${esc(maskEmail(e.email))}</code>` : [e.city, e.country].filter(Boolean).join(', ');
      return `<li class="pick"><span class="avatar">${face(e, 64)}</span><span class="who"><b>${esc(isFund ? e.firm : e.name)}</b><span>${esc(line2)}</span><span>${line3}</span></span></li>`;
    })
    .join('');
}

function valuePoints(list) {
  const pts = list.value_points || [];
  return `<ul class="checks">${pts.map((t) => `<li>${SMALL_ICONS.check}<span>${esc(t)}</span></li>`).join('')}</ul>`;
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
  <div class="stat"><span class="faces">${faces}</span><span><b>1,654 founders · $148M+ raised</b><small>with the investor data behind these lists</small></span></div>
  <div class="raised"><small>They raised from</small><span class="wms">${WORDMARKS}</span></div>
  <div class="rotator" aria-live="polite">${quotes}</div>
</section>`;
}

const CHIP_NAME = { 'usa-500': 'US', 'uk-200': 'UK', 'france-benelux-150': 'France + Benelux', 'apac-200': 'APAC', 'latam-canada-150': 'Canada + LatAm', 'lps-366': 'LPs', 'climate-vcs-474': 'Climate VCs' };

function chip(list) {
  return `<button class="chip" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog"><span class="dot">${ICONS[list.icon] || ICONS.globe}</span><span class="t"><b>${esc(list.count_label)}</b> ${esc(CHIP_NAME[list.slug] || list.short_name)}</span></button>`;
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

// The offer: top 10 on the left, the value stack and the buy button on the right.
function offerBlock(list, { sheet = false } = {}) {
  const isFund = list.slug === 'climate-vcs-474';
  return `<div class="picksCol">
    <div class="head"><h3>Top 10 picks<span class="script">straight from the sheet</span></h3>${sheet ? `<button class="viewall" type="button" data-sheet>View all ${n(list.stats.rows)} <span aria-hidden="true">↗</span></button>` : `<small>${n(list.stats.rows)} in the full list</small>`}</div>
    <ul class="picks">${picks(list)}</ul>
    <p class="more">… and ${n(Math.max(0, list.stats.rows - 10))} more with the full ${isFund ? 'details' : 'emails and LinkedIn'}.</p>
  </div>
  <div class="valueCol">
    <div class="buy">
      <div class="bigprice">${usd(list.price_cents)}<small>one time · yours forever</small></div>
      <button class="btn big" data-buy="${esc(list.slug)}">Get the list</button>
    </div>
    <p class="fine">Stripe checkout. Card, Apple Pay, Google Pay. CSV by email in 2 minutes, receipt and invoice included.</p>
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

// Spreadsheet preview. Only the name and photo are real; every other cell is a blurred placeholder, never the data.
const BLUR = {
  title: ['Managing Partner', 'Chief Investment Officer', 'Co-Founder & CEO', 'Head of Investments', 'Principal'],
  firm: ['Northgate Family Office', 'Alder Capital Partners', 'Meridian Holdings', 'Vantage Wealth', 'Harbour & Co'],
  email: ['firstname@familyoffice.com', 'name@capitalpartners.eu', 'info.direct@holdings.com', 'first.last@wealth.com'],
  linkedin: ['linkedin.com/in/firstname-lastname', 'linkedin.com/in/name-surname-42'],
  country: ['Germany', 'France', 'Switzerland', 'Sweden', 'Netherlands', 'United Kingdom'],
};
const bl = (k, i, step) => `<span class="blur">${BLUR[k][(i * step) % BLUR[k].length]}</span>`;

function sheetDialog(list) {
  const rows = (list.rows || []).map((r, i) => {
    const label = r.name || r.firm || '';
    const av = r.photo_url
      ? `<img src="${esc(r.photo_url)}" alt="" loading="lazy" width="24" height="24" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initials(label))}'}))">`
      : `<span>${esc(initials(label))}</span>`;
    return `<tr><td class="ix">${i + 1}</td><td class="nm"><span class="av">${av}</span>${esc(label)}</td><td>${bl('title', i, 3)}</td><td>${bl('firm', i, 2)}</td><td>${bl('email', i, 1)}</td><td>${bl('linkedin', i, 1)}</td><td>${bl('country', i, 5)}</td></tr>`;
  });
  return `<dialog class="preview sheetdlg" id="sheet" aria-label="All ${n(list.stats.rows)} rows">
  <div class="pvhead"><span class="script">the full list</span><h2>${n(list.stats.rows)} rows, blurred. Names are real.</h2><button class="close" type="button" data-close aria-label="Close">×</button></div>
  <div class="grid-wrap"><table class="sheettbl"><thead><tr><th class="ix">#</th><th>Name</th><th>Title</th><th>Firm</th><th>Email</th><th>LinkedIn</th><th>Country</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
  <div class="pvfoot"><span>Email, firm, title and LinkedIn unlock when you buy.</span><button class="btn" data-buy="${esc(list.slug)}">Unlock all ${n(list.stats.rows)} for ${usd(list.price_cents)}</button></div>
</dialog>`;
}

// One page, one offer: the featured list ($90). The other lists are chips that open the same offer in a dialog.
export function page(lists, featured) {
  const f = lists.find((l) => l.slug === featured) || lists[0];
  const others = lists.filter((l) => l !== f);
  const body = `
<header class="hero">
  ${brand()}
  <div class="title">
    <span class="script">${featured ? `you asked for ${esc(f.short_name)}. here it is.` : 'hey, founders and fund managers'}</span>
    <h1><span class="hl">${esc(f.name)}</span></h1>
    ${statRow(f)}
  </div>
</header>

<section class="offer main" id="offer" ${toneAttr(f)}>${offerBlock(f, { sheet: true })}</section>

<section class="chips"><span class="lbl">+ ${others.length} more lists</span><span class="row">${others.map(chip).join('')}</span></section>
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

export function thanksPage() {
  const body = `
<header class="topbar">${brand()}</header>
<section class="thanks">
  <div class="mail">${SMALL_ICONS.mail}</div>
  <span class="script" style="font-size:24px">paid. thank you.</span>
  <h1>It's on its way.</h1>
  <p>Your list is being emailed to the address you used at checkout. Give it two minutes, then check the promotions tab if it's not in the inbox.</p>
</section>
<section class="upsell" id="upsell" hidden>
  <span class="script">one more thing</span>
  <h2>Add every other list for <span class="hl">$${UPSELL}</span></h2>
  <p class="sub" id="upsell-sub">The rest of the investor lists, same format, same email delivery.</p>
  <ul class="names" id="upsell-names"></ul>
  <button class="btn big" id="upsell-buy" data-upsell>Add them all for $${UPSELL}</button>
  <p class="fine">One payment. They arrive in the same inbox in 2 minutes. No thanks? You're done, nothing else to do.</p>
</section>
<p class="thanks-small small">Nothing after ten minutes? Email <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a> with your receipt.</p>`;
  return shell({ title: 'Thank you · Climate Insiders Investor Lists', description: 'Your list is on its way.', canonical: `${SITE}/thanks`, body });
}
