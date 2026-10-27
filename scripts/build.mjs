// Builds dist/ from Supabase (paid_lists + paid_list_entries). `--local` uses scripts/fixture.json.
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { page, allPage, thanksPage } from './render.mjs';

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

async function loadLists() {
  if (local) {
    console.log('Building from scripts/fixture.json');
    return JSON.parse(await readFile(path.join(root, 'scripts', 'fixture.json'), 'utf8')).lists;
  }
  const lists = await sb('paid_lists?active=eq.true&order=sort_order.asc');
  for (const l of lists) {
    const [stats] = await sb(`rpc/paid_list_stats?slug=${l.slug}`).catch(() => [null]);
    l.stats = stats || (await computeStats(l.slug));
    l.sample = await sb(`paid_list_entries?slug=eq.${l.slug}&is_sample=eq.true&order=sort_order.asc&select=name,title,firm,country,region,city,email,website,extra,photo_url,logo_url`);
  }
  return lists;
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
  const lists = decorate(await loadLists());
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, 'public'), dist, { recursive: true });
  await writeFile(path.join(dist, 'index.html'), page(lists, null));
  for (const l of lists) {
    await mkdir(path.join(dist, l.slug), { recursive: true });
    await writeFile(path.join(dist, l.slug, 'index.html'), page(lists, l.slug));
  }
  await mkdir(path.join(dist, 'all'), { recursive: true });
  await writeFile(path.join(dist, 'all', 'index.html'), allPage(lists));
  await mkdir(path.join(dist, 'thanks'), { recursive: true });
  await writeFile(path.join(dist, 'thanks', 'index.html'), thanksPage());
  await writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', 'all', ...lists.map((l) => l.slug)]
      .map((p) => `  <url><loc>https://lists.climateinsiders.com/${p}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://lists.climateinsiders.com/sitemap.xml\n');
  if (!existsSync(path.join(dist, 'og.png'))) console.warn('No og.png in public/, social previews will be blank');
  console.log(`Built ${lists.length + 2} pages into dist/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
