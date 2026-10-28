// Turns raw rows (purchases, posts, funnel events, lists) into everything /dashboard shows.
// Pure function, no I/O, so it can be tested locally with fixtures.
const TZ = 'Europe/Lisbon';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const DAY = 86400000;

export function lisbonDay(d) {
  return dayFmt.format(new Date(d)); // YYYY-MM-DD
}

// Monday (YYYY-MM-DD) of the ISO week holding this Lisbon calendar day.
export function weekOf(day) {
  const [y, m, dd] = day.split('-').map(Number);
  const t = Date.UTC(y, m - 1, dd);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
}

export function isoWeekNo(monday) {
  const [y, m, d] = monday.split('-').map(Number);
  const thu = new Date(Date.UTC(y, m - 1, d + 3));
  const jan1 = Date.UTC(thu.getUTCFullYear(), 0, 1);
  return { year: thu.getUTCFullYear(), week: Math.ceil(((thu - jan1) / DAY + 1) / 7) };
}

const addDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export function netOf(p) {
  if (p.net_cents !== null && p.net_cents !== undefined) return { net: p.net_cents, estimated: Boolean(p.fee_estimated) };
  return { net: p.amount_cents - Math.round(p.amount_cents * 0.029 + 30), estimated: true };
}

// utm fields, falling back to the utm params inside `ref` (the landing URL or referrer).
export function saleSource(a) {
  a = a || {};
  let source = a.utm_source || null;
  let campaign = a.utm_campaign || null;
  let content = a.utm_content || null;
  if (a.ref) {
    try {
      const u = new URL(a.ref);
      source = source || u.searchParams.get('utm_source');
      campaign = campaign || u.searchParams.get('utm_campaign');
      content = content || u.searchParams.get('utm_content');
      const host = u.hostname.replace(/^www\./, '');
      if (!source && !/climateinsiders\.com$/.test(host)) source = /linkedin|lnkd/.test(host) ? 'linkedin' : host;
    } catch {
      if (!source) source = `ref:${String(a.ref).slice(0, 40)}`;
    }
  }
  return { source: source || null, campaign: campaign || null, content: content || null };
}

const lc = (s) => (s === null || s === undefined ? '' : String(s).trim().toLowerCase());
const personKey = (e) => lc(e.profile_url) || lc(e.person_name) || `anon-${e.id || Math.random()}`;
const ratio = (a, b) => (b ? a / b : null);

export function buildDashboard({ purchases = [], posts = [], events = [], lists = [], visits = [], now = new Date() }) {
  const listName = Object.fromEntries(lists.map((l) => [l.slug, l.name]));
  const listByKeyword = Object.fromEntries(lists.filter((l) => l.keyword).map((l) => [lc(l.keyword), l.slug]));
  const sales = purchases
    .filter((p) => p.amount_cents > 0)
    .map((p) => {
      const { net, estimated } = netOf(p);
      return { ...p, net, estimated, src: saleSource(p.attribution), t: new Date(p.created_at).getTime() };
    })
    .sort((a, b) => a.t - b.t);

  // ---- posts and which post an event or sale belongs to ----
  const P = posts.map((p) => ({
    ...p,
    kw: lc(p.keyword),
    t: p.posted_at ? Date.parse(`${p.posted_at}T00:00:00Z`) : Date.parse(p.created_at || 0),
    sales: [],
    events: [],
  }));
  // Same keyword reused: take the latest post published on or before that moment.
  const postFor = (kw, t) => {
    const c = P.filter((p) => p.kw && p.kw === lc(kw));
    if (!c.length) return null;
    const before = c.filter((p) => p.t <= t + DAY).sort((a, b) => b.t - a.t);
    if (before[0]) return before[0];
    // Activity from before the first post with this keyword (an older post reused the word) stays unmatched.
    const earliest = c.sort((a, b) => a.t - b.t)[0];
    return t >= earliest.t - 3 * DAY ? earliest : null;
  };
  // A list keyword (EU500) that no post uses: the latest post promoting that list.
  const postForList = (kw, t) => {
    const slug = listByKeyword[lc(kw)];
    const c = slug ? P.filter((p) => p.list_slug === slug && p.t <= t + DAY).sort((a, b) => b.t - a.t) : [];
    return c[0] || null;
  };
  const postForRef = (ref) => (ref ? P.find((p) => p.url && (p.url.includes(ref) || ref.includes(p.url))) || null : null);

  // Outbound DMs we sent (dm_sent) are tracked separately: they are not leads.
  const SENT = events.filter((e) => e.event_type === 'dm_sent').map((e) => ({ ...e, t: new Date(e.occurred_at).getTime() }));
  const E = events.filter((e) => e.event_type !== 'dm_sent').map((e) => ({ ...e, t: new Date(e.occurred_at).getTime(), who: personKey(e) }));
  for (const e of E) {
    e.post = (e.keyword && (postFor(e.keyword, e.t) || postForList(e.keyword, e.t))) || postForRef(e.post_ref);
    if (e.post) e.post.events.push(e);
  }

  // Sale -> post: utm_campaign = keyword, then the list keyword (EU500 -> the post on that list),
  // then a lead with the same first name in the 30 days before the sale, if that points at one post.
  for (const s of sales) {
    let post = null;
    let how = null;
    if (s.src.campaign) {
      post = postFor(s.src.campaign, s.t);
      if (post) how = 'utm';
      else if ((post = postForList(s.src.campaign, s.t))) how = 'list keyword';
    }
    if (!post && s.first_name) {
      const fn = lc(s.first_name);
      const hits = new Set(E.filter((e) => e.post && e.t <= s.t && e.t >= s.t - 30 * DAY && lc(e.person_name).split(/\s+/)[0] === fn).map((e) => e.post));
      if (hits.size === 1) { post = [...hits][0]; how = 'lead name'; }
    }
    s.post = post;
    s.how = how;
    if (post) post.sales.push(s);
  }

  const sum = (a, f) => a.reduce((x, r) => x + (typeof f === 'function' ? f(r) : r[f] || 0), 0);
  // Visits: rows of (day, path, source, campaign, visits). A visit counts for a post when its campaign = the post keyword.
  const V = visits.map((v) => ({ ...v, t: Date.parse(`${v.day}T12:00:00Z`), n: v.visits || 0 }));
  for (const v of V) { v.post = v.campaign ? postFor(v.campaign, v.t) || postForList(v.campaign, v.t) : null; }
  for (const p of P) p.visits = sum(V.filter((v) => v.post === p), 'n');
  const leadsIn = (evs) => new Set(evs.map((e) => e.who)).size;

  // ---- top cards ----
  const thisWeek = weekOf(lisbonDay(now));
  const lastWeek = addDays(thisWeek, -7);
  const inWeek = (t, wk) => weekOf(lisbonDay(t)) === wk;
  const sw = sales.filter((s) => inWeek(s.t, thisWeek));
  const sl = sales.filter((s) => inWeek(s.t, lastWeek));
  const leads = leadsIn(E);
  const totals = {
    gross: sum(sales, 'amount_cents'),
    net: sum(sales, 'net'),
    net_estimated: sales.some((s) => s.estimated),
    sales: sales.length,
    this_week: { gross: sum(sw, 'amount_cents'), net: sum(sw, 'net'), sales: sw.length },
    last_week: { gross: sum(sl, 'amount_cents'), net: sum(sl, 'net'), sales: sl.length },
    comments: E.filter((e) => e.event_type === 'comment').length,
    dms: E.filter((e) => e.event_type === 'dm').length,
    dms_sent: SENT.length,
    events: E.length,
    leads,
    visits: sum(V, 'n'),
    linkedin_visits: sum(V.filter((v) => v.source === 'linkedin'), 'n'),
    visit_conversion: ratio(sales.length, sum(V, 'n')),
    conversion: ratio(sales.length, leads),
    currency: (sales[0]?.currency || 'usd').toUpperCase(),
  };

  // ---- weekly cohort ----
  const firstT = Math.min(...[...sales.map((s) => s.t), ...E.map((e) => e.t), ...P.filter((p) => p.posted_at).map((p) => p.t)].filter(Number.isFinite), now.getTime());
  let wk = weekOf(lisbonDay(firstT));
  const minWk = addDays(thisWeek, -7 * 25);
  if (wk < minWk) wk = minWk;
  const weeks = [];
  for (; wk <= thisWeek; wk = addDays(wk, 7)) {
    const ws = sales.filter((s) => inWeek(s.t, wk));
    const we = E.filter((e) => inWeek(e.t, wk));
    const wp = P.filter((p) => p.posted_at && weekOf(p.posted_at) === wk);
    const wv = sum(V.filter((v) => weekOf(v.day) === wk), 'n');
    const l = leadsIn(we);
    const g = sum(ws, 'amount_cents');
    const { year, week } = isoWeekNo(wk);
    weeks.push({
      week: wk, label: `W${week}`, year,
      posts: wp.length, impressions: sum(wp, 'impressions'),
      comments: we.filter((e) => e.event_type === 'comment').length,
      dms: we.filter((e) => e.event_type === 'dm').length,
      leads: l, visits: wv, sales: ws.length, gross: g, net: sum(ws, 'net'),
      conversion: ratio(ws.length, l), rev_per_lead: ratio(g, l), visit_conversion: ratio(ws.length, wv),
    });
  }
  weeks.reverse();

  // ---- day by day, last 14 days (Lisbon days): the daily CVR view ----
  const today = lisbonDay(now);
  const days = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays(today, -i);
    const ds = sales.filter((s) => lisbonDay(s.t) === day);
    const de = E.filter((e) => lisbonDay(e.t) === day);
    const dv = sum(V.filter((v) => v.day === day), 'n');
    days.push({
      day,
      comments: de.filter((e) => e.event_type === 'comment').length,
      dm_requests: de.filter((e) => e.event_type === 'dm').length,
      dms_sent: SENT.filter((e) => lisbonDay(e.t) === day).length,
      visits: dv,
      sales: ds.length, gross: sum(ds, 'amount_cents'), net: sum(ds, 'net'),
      visit_conversion: ratio(ds.length, dv),
    });
  }

  // ---- per post ----
  const postRows = P.map((p) => {
    const captured = p.events.filter((e) => e.event_type === 'comment').length;
    const l = leadsIn(p.events);
    const g = sum(p.sales, 'amount_cents');
    return {
      id: p.id, title: p.title, url: p.url, posted_at: p.posted_at, keyword: p.keyword, list_slug: p.list_slug,
      list_name: listName[p.list_slug] || null, notes: p.notes,
      impressions: p.impressions, reactions: p.reactions, reposts: p.reposts, comments_count: p.comments_count,
      comments_captured: captured,
      comments: Math.max(captured, p.comments_count || 0),
      dms: p.events.filter((e) => e.event_type === 'dm').length,
      leads: l, visits: p.visits, sales: p.sales.length, gross: g, net: sum(p.sales, 'net'),
      conversion: ratio(p.sales.length, l), rev_per_lead: ratio(g, l), visit_conversion: ratio(p.sales.length, p.visits),
      rpm: p.impressions ? (g / p.impressions) * 1000 : null,
    };
  }).sort((a, b) => b.gross - a.gross || (b.rev_per_lead || 0) - (a.rev_per_lead || 0));
  const best = postRows.find((p) => p.gross > 0) || null;
  const un = sales.filter((s) => !s.post);
  const unE = E.filter((e) => !e.post);
  const unattributed = {
    sales: un.length, gross: sum(un, 'amount_cents'), net: sum(un, 'net'),
    events: unE.length, leads: leadsIn(unE),
    keywords: [...new Set(unE.map((e) => e.keyword).filter(Boolean))].slice(0, 12),
  };

  // ---- by list (bundle on its own line; a multi-list order splits its revenue across its lists) ----
  const byList = {};
  const addL = (k, name, n, g, net) => {
    byList[k] = byList[k] || { key: k, name, sales: 0, gross: 0, net: 0 };
    byList[k].sales += n; byList[k].gross += g; byList[k].net += net;
  };
  for (const s of sales) {
    if (s.bundle) addL('bundle', 'All 10 bundle', 1, s.amount_cents, s.net);
    else {
      const slugs = s.slugs?.length ? s.slugs : ['unknown'];
      for (const sl of slugs) addL(sl, listName[sl] || sl, 1, s.amount_cents / slugs.length, s.net / slugs.length);
    }
  }
  const lists_ = Object.values(byList).map((r) => ({ ...r, gross: Math.round(r.gross), net: Math.round(r.net) })).sort((a, b) => b.gross - a.gross);

  // ---- by source ----
  const bySrc = {};
  for (const s of sales) {
    const k = `${s.src.source || 'direct or unknown'}|${s.src.campaign || ''}`;
    bySrc[k] = bySrc[k] || { source: s.src.source || 'direct or unknown', campaign: s.src.campaign || null, sales: 0, gross: 0, net: 0 };
    bySrc[k].sales += 1; bySrc[k].gross += s.amount_cents; bySrc[k].net += s.net;
  }
  const sources = Object.values(bySrc).sort((a, b) => b.gross - a.gross);

  // ---- recent sales (first name only) ----
  const recent = sales.slice(-20).reverse().map((s) => ({
    at: s.created_at,
    first_name: s.first_name || null,
    what: s.bundle ? 'All 10 bundle' : (s.slugs || []).map((x) => listName[x] || x).join(', ') || 'unknown',
    amount: s.amount_cents, net: s.net, estimated: s.estimated,
    country: s.attribution?.country || null,
    source: [s.src.source, s.src.campaign].filter(Boolean).join(' / ') || 'direct or unknown',
    post: s.post ? s.post.title : null,
  }));

  return { generated_at: now.toISOString(), totals, weeks, days, posts: postRows, best_post_id: best ? best.id : null, unattributed, lists: lists_, sources, recent, takeaways: takeaways({ postRows, lists_, totals, unattributed }) };
}

const usd = (c) => (Math.abs(c || 0) < 1000 ? `$${((c || 0) / 100).toFixed(2)}` : `$${Math.round((c || 0) / 100).toLocaleString('en-US')}`);
const pct = (x) => `${Math.round(x * 1000) / 10}%`;

function takeaways({ postRows, lists_, totals, unattributed }) {
  const out = [];
  const withLeads = postRows.filter((p) => p.leads > 0 && p.gross > 0).sort((a, b) => b.rev_per_lead - a.rev_per_lead);
  const byRev = postRows.filter((p) => p.gross > 0);
  if (withLeads.length) {
    const p = withLeads[0];
    out.push(`Best post per lead: "${p.title}" makes ${usd(p.rev_per_lead)} per lead (${p.sales} ${p.sales === 1 ? 'sale' : 'sales'} from ${p.leads} leads).${withLeads[1] ? ` Next is "${withLeads[1].title}" at ${usd(withLeads[1].rev_per_lead)}.` : ''}`);
  } else if (byRev.length) {
    const p = byRev[0];
    out.push(`Best post so far: "${p.title}" with ${usd(p.gross)} from ${p.sales} ${p.sales === 1 ? 'sale' : 'sales'}. No leads captured for it yet, so revenue per lead is unknown.`);
  } else {
    out.push('No sale is tied to a post yet. Reply with links that carry utm_campaign=<keyword> so each sale lands on its post.');
  }
  if (lists_.length) {
    const l = lists_[0];
    const share = totals.gross ? l.gross / totals.gross : 0;
    out.push(`Top seller: ${l.name}, ${l.sales} ${l.sales === 1 ? 'sale' : 'sales'} and ${usd(l.gross)} (${pct(share)} of revenue).`);
  }
  const tw = totals.this_week;
  const lw = totals.last_week;
  if (lw.gross > 0) {
    const d = (tw.gross - lw.gross) / lw.gross;
    out.push(`This week: ${usd(tw.gross)} from ${tw.sales} ${tw.sales === 1 ? 'sale' : 'sales'}, ${d >= 0 ? 'up' : 'down'} ${pct(Math.abs(d))} on last week (${usd(lw.gross)}).`);
  } else if (tw.gross > 0) {
    out.push(`This week: ${usd(tw.gross)} from ${tw.sales} ${tw.sales === 1 ? 'sale' : 'sales'}. Nothing last week to compare with.`);
  } else if (unattributed.sales) {
    out.push(`${unattributed.sales} of ${totals.sales} sales have no post attached. Tag every reply link.`);
  }
  return out.slice(0, 3);
}
