// Local server with the real API: serves dist/ and runs api/*.js, reading keys from .env / .env.local.
//   npm run dev:api      -> http://localhost:3000
// Put your TEST keys in .env: STRIPE_SECRET_KEY=sk_test_..., STRIPE_PUBLISHABLE_KEY=pk_test_...
// Without SUPABASE_URL the fixture lists are used, so checkout works without a database.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);

for (const f of ['.env', '.env.local']) {
  const file = path.join(root, f);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
process.env.LOCAL_DEV = '1';
process.env.SITE_URL = process.env.SITE_URL_LOCAL || `http://localhost:${PORT}`;

const built = spawnSync('node', [path.join(root, 'scripts', 'build.mjs'), '--local'], { stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status || 1);

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9_-]/gi, '');
      const file = path.join(root, 'api', `${name}.js`);
      if (!existsSync(file)) { res.statusCode = 404; return res.end('{"error":"no such endpoint"}'); }
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    let p = path.join(root, 'dist', decodeURIComponent(url.pathname));
    if (!p.startsWith(path.join(root, 'dist'))) { res.statusCode = 403; return res.end(); }
    if (existsSync(p) && (await stat(p)).isDirectory()) p = path.join(p, 'index.html');
    else if (!existsSync(p) && existsSync(p + '.html')) p += '.html';
    const body = await readFile(p);
    res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
    res.end(body);
  } catch (err) {
    if (err.code === 'ENOENT') { res.statusCode = 404; return res.end('Not found'); }
    console.error(err);
    res.statusCode = 500;
    res.end(String(err.message || err));
  }
}).listen(PORT, () => {
  const hasKey = Boolean(process.env.STRIPE_SECRET_KEY);
  console.log(`\nhttp://localhost:${PORT}  (API on, ${hasKey ? 'Stripe key found' : 'NO Stripe key: add STRIPE_SECRET_KEY to .env'}${process.env.STRIPE_PUBLISHABLE_KEY ? ', embedded checkout on' : ', no STRIPE_PUBLISHABLE_KEY: hosted Stripe page'})`);
});
