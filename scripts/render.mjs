import { ICONS, SMALL_ICONS } from './icons.mjs';

const SITE = 'https://lists.climateinsiders.com';
const BUNDLE = 390;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x) => Number(x || 0).toLocaleString('en-US');
const pad = (i) => String(i).padStart(2, '0');
const usd = (c) => `$${Math.round(c / 100)}`;

// Each list gets its own personality: a colour wash and an ink for the polaroid.
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
  return (s || '?')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function logoImg(e, size) {
  const d = domainOf(e);
  if (!d) return `<span>${esc(initials(e.firm || e.name))}</span>`;
  return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initials(e.firm || e.name))}'}))">`;
}

function maskEmail(e) {
  if (!e) return '';
  const [u, d] = e.split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(3, Math.min(6, u.length - 2)))}@${d}`;
}

export function shell({ title, description, body, canonical, ogTitle, extraHead = '' }) {
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
<meta property="og:image" content="${SITE}/og.png">
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
  <button class="btn" data-buy="all">All 10 lists · $${BUNDLE}</button>
</header>`;
}

function footer() {
  return `<footer class="foot">
  <span>Real people. Real contacts.</span>
  <span>Sorted by region, then office.</span>
  <span>Built for founders and fund managers.</span>
  <span><a href="https://climateinsiders.com">climateinsiders.com</a> · <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a></span>
</footer>`;
}

function toneAttr(list) {
  const [bg, ink] = TONES[list.slug] || ['#e8dcc6', '#1f1b16'];
  return `style="--tone:${bg};--tone-ink:${ink}"`;
}

export function card(list, i, { featured = false } = {}) {
  const s = list.stats;
  const metaA = s.emails ? `<b>${n(s.emails)}</b> emails` : `<b>${n(s.rows)}</b> rows`;
  const metaB = s.firms ? `<b>${n(s.firms)}</b> ${list.slug === 'climate-vcs-474' ? 'funds' : 'offices'}` : '';
  const metaC = s.countries > 1 ? `<b>${s.countries}</b> countries` : '';
  const meta = [metaA, metaB, metaC].filter(Boolean).join(' · ');
  const logos = (list.sample || []).filter((e) => domainOf(e)).slice(0, 3).map((e) => logoImg(e, 32)).join('');
  return `<button class="card" type="button" data-open="${esc(list.slug)}" ${toneAttr(list)} aria-haspopup="dialog">
  <span class="tape"></span>
  <span class="num">${pad(i + 1)}</span>
  <span class="pin">${esc(list.short_name)}</span>
  ${featured ? `<span class="stamp">this one</span>` : ''}
  <span class="polaroid"><span class="photo">${ICONS[list.icon] || ICONS.globe}<span class="logos">${logos}</span></span></span>
  <span class="count">${esc(list.count_label)}<small>${esc(list.count_unit)}</small></span>
  <span class="name">${esc(list.card_name)}</span>
  <span class="meta">${meta}</span>
  <span class="foot"><span class="price">${usd(list.price_cents)}</span><span class="open">see the top 10</span></span>
</button>`;
}

function picks(list) {
  const isFund = list.slug === 'climate-vcs-474';
  return (list.sample || [])
    .slice(0, 10)
    .map((e) => {
      const x = e.extra || {};
      const line2 = isFund
        ? [e.region, x.stage].filter(Boolean).join(' · ')
        : [e.title, e.firm].filter(Boolean).join(' · ');
      const line3 = isFund ? (x.sector || '') : e.email ? `<code>${esc(maskEmail(e.email))}</code>` : e.city || e.country || '';
      return `<li class="pick"><span class="logo">${logoImg(e, 64)}</span><span class="who"><b>${esc(isFund ? e.firm : e.name)}</b><span>${esc(line2)}</span><span>${line3}</span></span></li>`;
    })
    .join('');
}

function checks(list) {
  const s = list.stats;
  const isFund = list.slug === 'climate-vcs-474';
  const items = isFund
    ? [`${n(s.rows)} funds, website on every row`, 'Stage, sector, ticket size, lead or follow', 'CSV + Airtable view', 'Reply with a wrong row, I fix it']
    : [`${n(s.rows)} named people at ${n(s.firms)} offices`, `${n(s.emails)} direct emails${s.linkedin ? `, ${n(s.linkedin)} LinkedIn` : ''}`, 'CSV + Airtable view, in your inbox in 2 minutes', 'Reply with a wrong row, I fix it'];
  return `<ul class="checks">${items.map((t) => `<li>${SMALL_ICONS.check}<span>${esc(t)}</span></li>`).join('')}</ul>`;
}

export function preview(list, lists) {
  const isFund = list.slug === 'climate-vcs-474';
  return `<dialog class="preview" id="p-${esc(list.slug)}" data-slug="${esc(list.slug)}" aria-labelledby="t-${esc(list.slug)}">
<div class="sheet" ${toneAttr(list)}>
  <button class="close" type="button" data-close aria-label="Close">×</button>
  <div class="left">
    <span class="script">${esc(list.short_name)}</span>
    <h2 id="t-${esc(list.slug)}">${esc(list.name)}</h2>
    <p class="tag">${esc(list.tagline)}</p>
    ${checks(list)}
    <div class="bigprice">${usd(list.price_cents)}<small>one time · yours forever</small></div>
    <button class="btn big" data-buy="${esc(list.slug)}">Buy this list</button>
    <p class="fine">Secure checkout by Stripe. Card, Apple Pay, Google Pay. Receipt and invoice by email.</p>
  </div>
  <div class="right">
    <div class="head"><h3>Top 10 picks<span class="script">as they are in the sheet</span></h3><small>${n(list.stats.rows)} in the full list</small></div>
    <ul class="picks">${picks(list)}</ul>
    <p class="more">… and ${n(Math.max(0, list.stats.rows - 10))} more rows with the full ${isFund ? 'details' : 'emails and LinkedIn'}.</p>
    <form class="free" data-sample="${esc(list.slug)}" autocomplete="off">
      <label>Not sure yet? I'll email you these ten rows, unmasked, free.</label>
      <input class="hp" type="text" name="website" tabindex="-1" aria-hidden="true">
      <input name="email" type="email" required placeholder="you@company.com" aria-label="Your email">
      <button class="btn ghost" type="submit">Send the 10 rows</button>
    </form>
    <p class="others">${list.region_note ? esc(list.region_note) + ' · ' : ''}Or get <a href="#all" data-buy="all">all ${lists.length} lists for $${BUNDLE}</a>.</p>
  </div>
</div>
</dialog>`;
}

export function bundleBar(lists) {
  const total = lists.reduce((a, l) => a + (l.stats.rows || 0), 0);
  const full = lists.reduce((a, l) => a + l.price_cents / 100, 0);
  return `<section class="bundle" id="all">
  <div class="bubble">${SMALL_ICONS.bubble}</div>
  <div>
    <h2>All <em>${lists.length} lists</em>, one sheet each.</h2>
    <p>${n(total)} rows. Every region, plus the LPs and the climate funds. Pay once, keep forever.</p>
  </div>
  <button class="btn big" data-buy="all">Get all ${lists.length} · $${BUNDLE} <s>$${full}</s></button>
</section>`;
}

// One template. `featured` (a slug) puts that list first, stamps it and opens its preview on load.
export function page(lists, featured) {
  const ordered = featured ? [lists.find((l) => l.slug === featured), ...lists.filter((l) => l.slug !== featured)] : lists;
  const f = featured ? ordered[0] : null;
  const totalRows = lists.reduce((a, l) => a + (l.stats.rows || 0), 0);
  const totalEmails = lists.reduce((a, l) => a + (l.stats.emails || 0), 0);
  const body = `
<section class="hero">
  <div>
    <span class="script">${f ? `you asked for ${esc(f.short_name)}. here it is.` : 'hey, founders and fund managers'}</span>
    <h1>${f ? `<span class="hl">${esc(f.name)}</span>.` : `The <span class="hl">investor lists</span>.`}</h1>
    <p>${f ? `${esc(f.tagline)} <b>Click the card to see the top 10.</b> The other nine are below it.` : `Named decision makers at family offices, LPs and climate funds. <b>Pick a card, see the top 10, pay once.</b> It lands in your inbox in two minutes.`}</p>
  </div>
  <div class="aside">
    <div class="stats">
      <div><b>${n(totalRows)}</b><small>rows</small></div>
      <div><b>${n(totalEmails)}</b><small>emails</small></div>
      <div><b>${lists.length}</b><small>lists</small></div>
    </div>
    <span class="note">Hand-checked. Fixed when you tell me a row is wrong.</span>
  </div>
</section>
<section class="grid" id="lists">
${ordered.map((l, i) => card(l, lists.indexOf(l), { featured: f && l.slug === f.slug })).join('\n')}
</section>
${bundleBar(lists)}
${lists.map((l) => preview(l, lists)).join('\n')}`;
  const title = f ? `${f.name} · Climate Insiders` : 'Investor lists for founders and fund managers · Climate Insiders';
  const description = f
    ? `${f.tagline} ${n(f.stats.rows)} rows, ${n(f.stats.emails || 0)} emails. ${usd(f.price_cents)} one time, delivered by email.`
    : `${n(totalRows)} named investor contacts across family offices in Europe, the US, the UK, DACH, the Nordics, Asia-Pacific and the Americas, plus LPs and climate VC funds. $90 a list, $${BUNDLE} for all ten.`;
  return shell({
    title,
    description,
    canonical: f ? `${SITE}/${f.slug}` : `${SITE}/`,
    body,
    extraHead: f ? `<meta name="x-featured" content="${esc(f.slug)}">` : '',
  });
}

export function thanksPage() {
  const body = `
<section class="thanks">
  <div class="mail">${SMALL_ICONS.mail}</div>
  <span class="script" style="font-size:24px">paid. thank you.</span>
  <h1>It's on its way.</h1>
  <p>Your list is being emailed to the address you used at checkout. Give it two minutes, then check the promotions tab if it's not in the inbox.</p>
  <p class="small">One rule before you write to anyone: pick the twelve that fit your sector and stage. Leave the rest alone. Nothing after ten minutes? Email <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a> with your receipt.</p>
  <p><a class="btn ghost" href="/">Back to the lists</a></p>
</section>`;
  return shell({ title: 'Thank you · Climate Insiders Investor Lists', description: 'Your list is on its way.', canonical: `${SITE}/thanks`, body });
}
