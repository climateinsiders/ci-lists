import { ICONS, SMALL_ICONS } from './icons.mjs';

const SITE = 'https://lists.climateinsiders.com';
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
${topbar()}
${body}
${footer()}
</div>
<div id="toast" class="toast" role="status"></div>
<script src="/app.js" defer></script>
</body>
</html>`;
}

function topbar() {
  return `<header class="topbar">
  <a class="brand" href="/"><img src="/yoann.jpg" alt="" width="34" height="34"><span>Climate Insiders<small>Investor lists</small></span></a>
</header>`;
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

export function preview(list, lists, i) {
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
    <form class="free" data-sample="${esc(list.slug)}" autocomplete="off">
      <label>Not sure yet? I'll email you the 10 rows below, unmasked, free.</label>
      <input class="hp" type="text" name="website" tabindex="-1" aria-hidden="true">
      <input name="email" type="email" required placeholder="you@company.com" aria-label="Your email">
      <button class="btn ghost small" type="submit">Send</button>
    </form>
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

// One template. `featured` (a slug) puts that list first, un-greys it and opens its preview on load.
function chip(list, i) {
  return `<button class="chip" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog">
  <span class="dot">${ICONS[list.icon] || ICONS.globe}</span>
  <span class="t"><b>${esc(list.count_label)}</b> ${esc(list.card_name)}</span>
  <span class="lk">${SMALL_ICONS.lock}</span>
</button>`;
}

function bundleBar(lists) {
  const full = lists.reduce((a, l) => a + l.price_cents / 100, 0);
  const total = lists.reduce((a, l) => a + (l.stats.rows || 0), 0);
  return `<div class="bundle" id="all">
  <span class="tag">best value</span>
  <span class="txt"><b id="bundle-price">All ${lists.length} lists, $${BUNDLE}</b> <s>$${full}</s><small id="bundle-sub">${n(UNIQUE_INVESTORS)} investors. Every region, the LPs and the climate funds.</small></span>
  <button class="btn" data-buy="all">Get all ${lists.length}</button>
</div>`;
}

// One template. `featured` (a slug) leads, three more big cards follow, the rest sit in a compact row.
export function page(lists, featured) {
  const f = lists.find((l) => l.slug === featured) || lists[0];
  const rest = lists.filter((l) => l !== f);
  const big = [f, ...rest.slice(0, 3)];
  const small = rest.slice(3);
  const totalRows = lists.reduce((a, l) => a + (l.stats.rows || 0), 0);
  const body = `
<section class="hero">
  <div>
    <span class="script">${featured ? `you asked for ${esc(f.short_name)}. here it is.` : 'hey, founders and fund managers'}</span>
    <h1>${featured ? `<span class="hl">${esc(f.name)}</span>` : `The <span class="hl">investor lists</span>.`}</h1>
  </div>
  ${bundleBar(lists)}
</section>
<section class="grid" id="lists">
${big.map((l) => card(l, lists.indexOf(l), { featured: l === f })).join('\n')}
</section>
<section class="chips"><span class="lbl">+ ${small.length} more lists</span>${small.map((l) => chip(l, lists.indexOf(l))).join('')}</section>
${proofStrip()}
${lists.map((l, i) => preview(l, lists, i)).join('\n')}`;
  const title = featured ? `${f.name} · Climate Insiders` : 'Investor lists for founders and fund managers · Climate Insiders';
  const description = featured
    ? `${f.tagline} ${n(f.stats.rows)} rows. ${usd(f.price_cents)} one time, or all 10 lists for $${BUNDLE}.`
    : `${n(totalRows)} named investor contacts across family offices, LPs and climate VC funds. $90 a list, $${BUNDLE} for all ten.`;
  return shell({
    title,
    description,
    canonical: featured ? `${SITE}/${f.slug}` : `${SITE}/`,
    ogImage: featured && f.image_url ? f.image_url : undefined,
    body,
    extraHead: featured ? `<meta name="x-featured" content="${esc(f.slug)}">` : '',
  });
}

// /all: every list as a card, the bundle up top. Upsell emails land here (?u=<token> turns on upgrade pricing).
export function allPage(lists) {
  const body = `
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
${lists.map((l, i) => preview(l, lists, i)).join('\n')}`;
  return shell({
    title: 'All 10 investor lists · Climate Insiders',
    description: `${n(UNIQUE_INVESTORS)} investors across 10 lists: family offices in every region, LPs and climate VC funds. $${BUNDLE} for all ten.`,
    canonical: `${SITE}/all`,
    body,
    extraHead: '<meta name="x-page" content="all">',
  });
}

export function thanksPage() {
  const body = `
<section class="thanks">
  <div class="mail">${SMALL_ICONS.mail}</div>
  <span class="script" style="font-size:24px">paid. thank you.</span>
  <h1>It's on its way.</h1>
  <p>Check your inbox in two minutes. You'll get the Airtable link and the CSV from yoann@climateinsiders.com. Not there? Look in promotions.</p>
  <p class="small">One rule before you write to anyone: pick the twelve that fit your sector and stage. Leave the rest alone. Nothing after ten minutes? Reply to your Stripe receipt and I'll sort it.</p>
  <p><a class="btn ghost" href="/">Back to the lists</a></p>
</section>`;
  return shell({ title: 'Thank you · Climate Insiders Investor Lists', description: 'Your list is on its way.', canonical: `${SITE}/thanks`, body });
}
