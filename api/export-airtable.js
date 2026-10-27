import { getActiveLists, getEntries, selectRows, json } from './_lib.js';

// GET /api/export-airtable?t=<token>  -> tab-separated rows with the exact Airtable column names,
// for "Import data > Paste table data". Tokens live in airtable_export_tokens (one per list, expire).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.end();
  try {
    const t = String(new URL(req.url, 'http://x').searchParams.get('t') || '');
    if (!/^[a-f0-9]{32,64}$/.test(t)) return json(res, 403, { error: 'no' });
    const [tok] = await selectRows('airtable_export_tokens', `token=eq.${t}&select=slug,expires_at`);
    if (!tok || new Date(tok.expires_at) < new Date()) return json(res, 403, { error: 'expired' });
    const list = (await getActiveLists()).find((l) => l.slug === tok.slug);
    const entries = await getEntries(tok.slug);
    const cell = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
    const isFunds = entries.some((e) => e.extra && (e.extra.stage || e.extra.sector));
    let header, rows;
    if (isFunds) {
      header = ['Fund', 'Website', 'Geography', 'City', 'Stage', 'Sector', 'Takes the lead', 'Min ticket', 'Max ticket', '#', 'Status'];
      rows = entries.map((e) => {
        const x = e.extra || {};
        return [e.firm, e.website, e.region, e.city, x.stage, x.sector, x.lead, x.min, x.max, e.sort_order, 'To contact'];
      });
    } else {
      header = ['Name', 'Title', 'Firm', 'Email', 'LinkedIn', 'Country', 'City', 'Region', 'Website', '#', 'Status'];
      rows = entries.map((e) => [e.name, e.title, e.firm, e.email, e.linkedin_url, e.country, e.city, e.region, e.website, e.sort_order, 'To contact']);
    }
    const body = [header, ...rows].map((r) => r.map(cell).join('\t')).join('\n');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-List', list?.slug || tok.slug);
    res.end(body);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'export failed' });
  }
}
