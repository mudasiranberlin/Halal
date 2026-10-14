// Simulates how Vercel runs the app: the exported Express app is called per request,
// nothing listens on a port by itself, and the database connects on the first request.
//   VERCEL=1 CLOUDINARY_*=... node tests/vercel-mode.mjs
import http from 'node:http';
process.env.VERCEL = '1';
process.env.CLOUDINARY_CLOUD_NAME ||= 'democloud';
process.env.CLOUDINARY_API_KEY ||= '123';
process.env.CLOUDINARY_API_SECRET ||= 'secret';

const mod = await import('../src/server.js');
const app = mod.default;
let ok = 0; const bad = [];
const check = (n, c, x = '') => (c ? (ok++, console.log('  ✓ ' + n)) : (bad.push(n), console.log('  ✗ ' + n, x)));

check('server.js exports the Express app', typeof app === 'function');
const server = http.createServer(app).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const get = async (p, h = {}) => { const r = await fetch(base + p, { headers: h }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };

let r = await get('/api/health');
check('/api/health works (DB connected on demand)', r.s === 200 && r.j.ok);
r = await get('/health');
check('also works if the host strips the /api prefix', r.s === 200 && r.j.ok);
r = await get('/foods?limit=2');
check('stripped-prefix route /foods returns data', r.s === 200 && r.j.items.length === 2);
r = await get('/api/foods?limit=2');
check('/api/foods returns data', r.s === 200 && r.j.items.length === 2);

const post = (h) => fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ email: 'a@b.co', password: 'x' }) });
check('foreign Origin is still blocked', (await post({ Origin: 'http://evil.example' })).status === 403);
check('same-host Origin is allowed (e.g. a Vercel preview URL)', (await post({ Origin: base })).status === 401);
check('x-forwarded-host (public domain) is honoured', (await post({ Origin: 'https://myapp.vercel.app', 'x-forwarded-host': 'myapp.vercel.app' })).status === 401);
server.close();
console.log(`\n${ok} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
