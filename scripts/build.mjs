// Builds dist/ from Supabase (paid_lists + paid_list_entries). `--local` uses scripts/fixture.json.
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { page, allPage, thanksPage, welcomePage, setNav, setSectors, sectorsPage } from './render.mjs';
import { pickSample, sampleStats } from '../api/_pick.js';
import { termsPage } from './terms.mjs';
import { dashboardPage } from './dashboard.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const local = process.argv.includes('--local') || !process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);

async function sb(pathq) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to build (or run with --local)');
  const res = await fetch(`${url}/rest/v1/${pathq}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase ${pathq} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Sector lists (data/sectors.json): copy, stats and ten public rows. Locally they all show; in production only the ones
// that are active in paid_lists are built (publish = insert the list + its entries, see docs/sector-lists.md).
async function loadSectorData() {
  const f = path.join(root, 'data', 'sectors.json');
  return existsSync(f) ? JSON.parse(await readFile(f, 'utf8')).lists : [];
}

async function loadLists() {
  const sectorData = await loadSectorData();
  const sectorBySlug = new Map(sectorData.map((l) => [l.slug, l]));
  if (local) {
    console.log('Building from scripts/fixture.json');
    const lists = JSON.parse(await readFile(path.join(root, 'scripts', 'fixture.json'), 'utf8')).lists;
    for (const l of lists) l.rows = fixtureRows(l);
    for (const s of sectorData) lists.push({ ...s, rows: s.sample });
    return lists;
  }
  const lists = await sb('paid_lists?active=eq.true&order=sort_order.asc');
  for (const l of lists) {
    const sd = sectorBySlug.get(l.slug);
    if (sd) Object.assign(l, { kind: 'sector', sector: sd.sector, icon: sd.icon, keyword: sd.keyword, topic: sd.topic, short_name: l.short_name || sd.short_name, value_points: l.value_points?.length ? l.value_points : sd.value_points });
    const [stats] = await sb(`rpc/paid_list_stats?slug=${l.slug}`).catch(() => [null]);
    l.stats = stats || (await computeStats(l.slug));
    if (sd) l.stats = { ...sd.stats, ...l.stats, verified: sd.stats.verified }, l.pool = sd.pool; // verified status and the database total are not in paid_list_entries
    l.rows = await sb(`paid_list_entries?slug=eq.${l.slug}&order=sort_order.asc&select=sort_order,name,title,firm,country,region,extra,website,photo_url,logo_url`);
    // the free top 10: same rule as the emailed Excel (api/_pick.js), so page and inbox show the same ten
    const cand = await sb(`paid_list_entries?slug=eq.${l.slug}&order=sort_order.asc&select=sort_order,name,title,firm,country,region,city,email,linkedin_url,website,extra,photo_url,logo_url,is_sample`);
    l.sample = pickSample(cand);
    // the sheet preview opens with those same ten, in full (email + LinkedIn); the rest follow in list order
    const free = new Set(l.sample.map((e) => e.sort_order));
    l.rows = [...l.sample, ...l.rows.filter((r) => !free.has(r.sort_order))];
    const ss = sampleStats(cand);
    console.log(`sample ${l.slug}: ${ss.picked_complete}/${ss.picked} with email + LinkedIn (${ss.complete_rows} complete rows in the list)`);
  }
  return lists;
}

// Local preview only: the fixture has just the 10 sample rows, so pad with made-up names to show the sheet.
function fixtureRows(l) {
  const first = ['Anna', 'Lukas', 'Marie', 'Jonas', 'Elena', 'Pieter', 'Sofia', 'Henrik', 'Clara', 'Marco', 'Ingrid', 'Louis'];
  const last = ['Berg', 'Moreau', 'Keller', 'Lindqvist', 'Rossi', 'Dubois', 'Hansen', 'Weber', 'Janssen', 'Fontaine', 'Schmidt', 'Novak'];
  const titles = ['Managing Partner', 'Chief Investment Officer', 'Co-Founder & CEO', 'Head of Investments', 'Principal'];
  const firms = ['Northgate Family Office', 'Alder Capital', 'Meridian Holdings', 'Vantage Wealth', 'Harbour & Co'];
  const countries = ['Germany', 'France', 'Switzerland', 'Sweden', 'Netherlands'];
  const rows = l.sample.map((e) => ({ email: e.email, linkedin_url: e.linkedin_url || (e.email ? `https://www.linkedin.com/in/${String(e.name).toLowerCase().replace(/[^a-z]+/g, "-")}` : null), name: e.name, title: e.title, firm: e.firm, country: e.country, region: e.region, extra: e.extra, website: e.website, photo_url: e.photo_url, logo_url: e.logo_url }));
  const stages = ['Seed', 'Series A', 'Seed, Series A', 'Series A, Series B'];
  const sectors = ['Energy', 'Food and agritech', 'Transport and mobility', 'Climate software'];
  for (let i = rows.length; i < l.stats.rows; i++) {
    if (l.slug === 'climate-vcs-474') { rows.push({ name: null, firm: `Climate Fund ${i + 1}`, region: ['Europe', 'North America', 'Asia-Pacific'][i % 3], extra: { stage: stages[i % 4], sector: sectors[(i * 3) % 4], min: String(1 + (i % 3)), max: String(5 + (i % 6)), lead: i % 2 ? 'Yes' : 'No' } }); continue; }
    rows.push({ name: `${first[i % first.length]} ${last[(i * 7) % last.length]}`, title: titles[i % 5], firm: firms[(i * 3) % 5], country: countries[(i * 2) % 5] });
  }
  return rows;
}

async function computeStats(slug) {
  const rows = await sb(`paid_list_entries?slug=eq.${slug}&select=email,linkedin_url,firm,country`);
  return {
    rows: rows.length,
    emails: rows.filter((r) => r.email).length,
    linkedin: rows.filter((r) => r.linkedin_url).length,
    firms: new Set(rows.map((r) => (r.firm || '').toLowerCase()).filter(Boolean)).size,
    countries: new Set(rows.map((r) => r.country).filter(Boolean)).size,
  };
}

function decorate(lists) {
  for (const l of lists) {
    const m = l.name.match(/^(\d[\d,]*)\s+(.*)$/);
    l.count_label = m ? m[1] : String(l.stats.rows);
    l.card_name = m ? m[2].replace(/ contacts$/, '') : l.name;
    l.count_unit = l.slug === 'climate-vcs-474' ? 'funds' : l.slug === 'lps-366' ? 'people' : 'contacts';
  }
  return lists;
}

async function main() {
  const all = decorate(await loadLists());
  const lists = all.filter((l) => l.kind !== 'sector');
  const sectors = all.filter((l) => l.kind === 'sector');
  setNav(lists);
  setSectors(sectors);
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, 'public'), dist, { recursive: true });
  await writeFile(path.join(dist, 'index.html'), page(lists, null));
  for (const l of lists) {
    await mkdir(path.join(dist, l.slug), { recursive: true });
    await writeFile(path.join(dist, l.slug, 'index.html'), page(lists, l.slug));
  }
  for (const l of sectors) {
    await mkdir(path.join(dist, l.slug), { recursive: true });
    await writeFile(path.join(dist, l.slug, 'index.html'), page(sectors, l.slug));
  }
  if (sectors.length) {
    await mkdir(path.join(dist, 'sectors'), { recursive: true });
    await writeFile(path.join(dist, 'sectors', 'index.html'), sectorsPage(sectors));
  }
  await mkdir(path.join(dist, 'all'), { recursive: true });
  await writeFile(path.join(dist, 'all', 'index.html'), allPage(lists));
  await mkdir(path.join(dist, 'thanks'), { recursive: true });
  await writeFile(path.join(dist, 'thanks', 'index.html'), thanksPage());
  await mkdir(path.join(dist, 'welcome'), { recursive: true });
  await mkdir(path.join(dist, 'terms'), { recursive: true });
  await writeFile(path.join(dist, 'terms', 'index.html'), termsPage());
  await writeFile(path.join(dist, 'welcome', 'index.html'), welcomePage());
  await mkdir(path.join(dist, 'dashboard'), { recursive: true });
  await writeFile(path.join(dist, 'dashboard', 'index.html'), dashboardPage());
  await writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', 'all', ...(sectors.length ? ['sectors'] : []), ...lists.map((l) => l.slug), ...sectors.map((l) => l.slug), 'terms']
      .map((p) => `  <url><loc>https://lists.climateinsiders.com/${p}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nSitemap: https://lists.climateinsiders.com/sitemap.xml\n');
  if (!existsSync(path.join(dist, 'og.png'))) console.warn('No og.png in public/, social previews will be blank');
  console.log(`Built ${lists.length + sectors.length + 2} pages into dist/ (${sectors.length} sector lists)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
