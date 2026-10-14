// End-to-end test of the whole API. Needs the server running (npm run dev) and an
// EMPTY-ish test database with the demo seed applied plus an admin account:
//   ADMIN_EMAIL=admin@test.local ADMIN_PASSWORD='AdminPass123!x' npm run test:e2e
import sharp from 'sharp';
import { getOpenStatus } from '../src/utils/openStatus.js';

const BASE = process.env.API_URL || 'http://localhost:5000';
const ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!x';

let passed = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.log(`  ✗ ${name} ${extra}`); }
}
const section = (t) => console.log(`\n${t}`);

class Client {
  constructor() { this.jar = {}; }
  async req(method, url, body, { form, headers = {} } = {}) {
    const h = { Origin: ORIGIN, ...headers };
    const cookie = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) h.Cookie = cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + url, { method, headers: h, body: payload });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) delete this.jar[k]; else this.jar[k] = v.join('=');
    }
    let data = null;
    try { data = await res.json(); } catch { /* not json */ }
    return { status: res.status, data, headers: res.headers };
  }
  get = (u) => this.req('GET', u);
  post = (u, b) => this.req('POST', u, b);
  put = (u, b) => this.req('PUT', u, b);
  del = (u) => this.req('DELETE', u);
}

const img = (w = 400, h = 300, color = '#f97316', format = 'jpeg') =>
  sharp({ create: { width: w, height: h, channels: 3, background: color } })[format]().toBuffer();
const blob = (buf, type) => new Blob([buf], { type });

const HOURS = JSON.stringify(Array.from({ length: 7 }, (_, day) => ({ day, isClosed: false, open: '00:00', close: '00:00' }))); // open 24h

async function foodForm({ name = 'E2E Noodle House', images = 2, extra = {} } = {}) {
  const f = new FormData();
  const fields = {
    name, category: 'noodles', description: 'Great hand-pulled noodles and a friendly family.', address: '12 Street 240, Phnom Penh',
    city: 'Phnom Penh', phone: '+855 12 345 678', telegram: '@e2enoodles', latitude: '11.5600', longitude: '104.9200',
    businessHours: HOURS, priceRange: '$', features: JSON.stringify(['Wi-Fi', 'Takeaway']), ...extra,
  };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) f.append(k, v);
  for (let i = 0; i < images; i++) f.append('images', blob(await img(500 + i * 10, 400), 'image/jpeg'), `photo${i}.jpg`);
  return f;
}

const anon = new Client();
const user = new Client();
const user2 = new Client();
const admin = new Client();
const stamp = Date.now();
const U1 = { name: 'Sophea Tester', email: `sophea${stamp}@example.com`, password: 'Secret123', phone: '+855 12 000 111' };
const U2 = { name: 'Dara Tester', email: `dara${stamp}@example.com`, password: 'Secret456' };

/* ------------------------------------------------------------------ */
section('1. Public data');
let r = await anon.get('/api/health');
check('health ok', r.status === 200);
r = await anon.get('/api/categories');
check('categories returned with counts', r.data.categories.length >= 5 && r.data.categories.every((c) => 'count' in c));
r = await anon.get('/api/promotions');
check('carousel has 5 active promotions', r.data.items.length === 5, JSON.stringify(r.data).slice(0, 200));
check('promotion images are absolute URLs', r.data.items.every((p) => p.image.startsWith('http')));
const promoImg = await fetch(r.data.items[0].image);
check('promotion image is served as webp', promoImg.status === 200 && promoImg.headers.get('content-type') === 'image/webp');
r = await anon.get('/api/foods?limit=50');
check('public list returns demo foods', r.data.total >= 40 && r.data.items.every((f) => f.isDemo || f.isVerified));
check('demo listings flagged and never verified', r.data.items.filter((f) => f.isDemo).every((f) => f.isVerified === false));
check('list items do not leak owner/private fields', r.data.items.every((f) => !('createdBy' in f) && !('phone' in f) && !('status' in f)));
r = await anon.get('/api/foods?category=seafood');
check('category filter works', r.data.items.length > 0 && r.data.items.every((f) => f.category === 'seafood'));
r = await anon.get('/api/foods?q=street%20food');
check('search matches category label ("street food")', r.data.items.length > 0 && r.data.items.every((f) => f.category === 'street-food'));
r = await anon.get('/api/foods?q=kampot');
check('search by location/name works', r.data.items.length > 0);
r = await anon.get('/api/foods?lat=11.5564&lng=104.9282&radiusKm=10&sort=distance');
check('nearby returns distance, sorted nearest first', r.data.items.length > 0 && r.data.items.every((f, i, a) => typeof f.distanceKm === 'number' && (i === 0 || a[i - 1].distanceKm <= f.distanceKm)));
check('nearby respects radius', r.data.items.every((f) => f.distanceKm <= 10));
r = await anon.get('/api/foods?openNow=true&limit=50');
check('open-now filter only returns open places', r.data.items.every((f) => f.openStatus.state === 'open'));
r = await anon.get('/api/foods?limit=5&page=2');
check('pagination works', r.data.items.length === 5 && r.data.page === 2 && r.data.pages > 2);
r = await anon.get('/api/foods?category=bogus');
check('bad filter value rejected cleanly', r.status === 400 && r.data.message);
r = await anon.get('/api/foods/notanid');
check('bad id gives 404, not a crash', r.status === 404);

/* ------------------------------------------------------------------ */
section('2. Open / Closed / Opens Soon logic (Cambodia time, UTC+7)');
const wk = (open, close) => Array.from({ length: 7 }, (_, day) => ({ day, isClosed: false, open, close }));
const at = (iso) => new Date(iso); // UTC; 2026-10-05 is a Monday
check('open at 12:00 for 08-20', getOpenStatus(wk('08:00', '20:00'), at('2026-10-05T05:00:00Z')).state === 'open');
check('closed at 22:00 for 08-20', getOpenStatus(wk('08:00', '20:00'), at('2026-10-05T15:00:00Z')).state === 'closed');
check('opens soon 30 min before opening', getOpenStatus(wk('08:00', '20:00'), at('2026-10-05T00:30:00Z')).state === 'opens_soon');
check('closed 2h before opening', getOpenStatus(wk('08:00', '20:00'), at('2026-10-04T23:00:00Z')).state === 'closed');
check('overnight hours: open at 00:30 for 17-01', getOpenStatus(wk('17:00', '01:00'), at('2026-10-04T17:30:00Z')).state === 'open');
check('overnight hours: open at 23:00 for 17-01', getOpenStatus(wk('17:00', '01:00'), at('2026-10-05T16:00:00Z')).state === 'open');
check('overnight hours: closed at 03:00 for 17-01', getOpenStatus(wk('17:00', '01:00'), at('2026-10-04T20:00:00Z')).state === 'closed');
const monClosed = wk('08:00', '20:00'); monClosed[1].isClosed = true;
check('closed all day Monday', getOpenStatus(monClosed, at('2026-10-05T05:00:00Z')).state === 'closed');
check('no hours -> unknown', getOpenStatus([], new Date()).state === 'unknown');

/* ------------------------------------------------------------------ */
section('3. Sign up & login');
r = await anon.post('/api/auth/register', { name: 'A', email: 'bad', password: 'short' });
check('weak/invalid signup rejected with field errors', r.status === 400 && r.data.errors.email && r.data.errors.password && r.data.errors.name);
r = await anon.post('/api/auth/register', { ...U1, password: 'onlyletters' });
check('password without a number rejected', r.status === 400 && r.data.errors.password);
r = await user.post('/api/auth/register', U1);
check('signup works', r.status === 201 && r.data.user.email === U1.email.toLowerCase());
check('signup response never contains a password', !JSON.stringify(r.data).toLowerCase().includes('password') && !JSON.stringify(r.data).includes('$2'));
r = await anon.post('/api/auth/register', U1);
check('duplicate email rejected (409)', r.status === 409);
r = await user.get('/api/auth/me');
check('/auth/me works while logged in', r.status === 200 && r.data.user.name === U1.name && r.data.user.role === 'user');
r = await user.post('/api/auth/logout');
check('logout works', r.status === 200);
r = await user.get('/api/auth/me');
check('/auth/me blocked after logout', r.status === 401);
r = await user.post('/api/auth/login', { email: U1.email, password: 'WrongPass1' });
check('wrong password rejected with friendly message', r.status === 401 && /incorrect/i.test(r.data.message));
r = await user.post('/api/auth/login', { email: 'nobody@example.com', password: 'Whatever123' });
check('unknown email gives the same message', r.status === 401 && /incorrect/i.test(r.data.message));
r = await user.post('/api/auth/login', { email: U1.email.toUpperCase(), password: U1.password });
check('login works (email case-insensitive)', r.status === 200);
const rawLogin = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ email: U1.email, password: U1.password }) });
check('auth cookie is HttpOnly + SameSite', /HttpOnly/i.test(rawLogin.headers.get('set-cookie')) && /SameSite=Lax/i.test(rawLogin.headers.get('set-cookie')));
r = await user2.post('/api/auth/register', U2);
check('second user registered', r.status === 201);
r = await anon.req('POST', '/api/auth/login', { email: U1.email, password: U1.password }, { headers: { Origin: 'http://evil.example' } });
check('requests from a foreign Origin are blocked (CSRF)', r.status === 403);

/* ------------------------------------------------------------------ */
section('4. Add food -> pending');
r = await anon.req('POST', '/api/foods', undefined, { form: await foodForm() });
check('adding food requires login', r.status === 401);
r = await user.req('POST', '/api/foods', undefined, { form: await foodForm({ images: 1 }) });
check('1 image rejected (needs 2-3)', r.status === 400 && r.data.errors.images);
r = await user.req('POST', '/api/foods', undefined, { form: await foodForm({ images: 4 }) });
check('4 images rejected', r.status === 400);
let f = await foodForm({ images: 0 });
f.append('images', blob(Buffer.from('<?php echo 1; ?> not an image'), 'image/jpeg'), 'evil.jpg');
f.append('images', blob(await img(), 'image/jpeg'), 'ok.jpg');
r = await user.req('POST', '/api/foods', undefined, { form: f });
check('fake image (text renamed .jpg) rejected', r.status === 400, JSON.stringify(r.data));
f = await foodForm({ images: 0 });
f.append('images', blob(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml'), 'x.svg');
f.append('images', blob(await img(), 'image/jpeg'), 'ok.jpg');
r = await user.req('POST', '/api/foods', undefined, { form: f });
check('SVG upload rejected', r.status === 400);
f = await foodForm({ images: 1 });
f.append('images', blob(Buffer.alloc(3.5 * 1024 * 1024, 1), 'image/jpeg'), 'big.jpg');
r = await user.req('POST', '/api/foods', undefined, { form: f });
check('image over 3 MB rejected', r.status === 400 && /3 MB/.test(r.data.message), JSON.stringify(r.data));
r = await user.req('POST', '/api/foods', undefined, { form: await foodForm({ extra: { latitude: '999' } }) });
check('invalid latitude rejected', r.status === 400 && r.data.errors.latitude);
r = await user.req('POST', '/api/foods', undefined, { form: await foodForm({ extra: { businessHours: '[]' } }) });
check('missing business hours rejected', r.status === 400 && r.data.errors.businessHours);
r = await user.req('POST', '/api/foods', undefined, { form: await foodForm({ name: `E2E Noodle House ${stamp}` }) });
check('valid submission accepted', r.status === 201 && /waiting for approval/.test(r.data.message));
const food = r.data.food;
check('new submission is pending and not verified', food.status === 'pending' && food.isVerified === false);
check('uploaded images are webp URLs that load', food.images.length === 2 && (await fetch(food.images[0])).headers.get('content-type') === 'image/webp');
r = await anon.get('/api/foods?q=' + stamp);
check('pending food NOT in public list', r.data.total === 0);
r = await anon.get('/api/foods/' + food.id);
check('pending food NOT visible by direct link (anon)', r.status === 404);
r = await user2.get('/api/foods/' + food.id);
check('pending food NOT visible to other users', r.status === 404);
r = await user.get('/api/foods/' + food.id);
check('submitter can see their own pending listing', r.status === 200 && r.data.food.status === 'pending');
r = await user.get('/api/foods/mine');
check('"my submissions" lists it', r.data.items.some((x) => x.id === food.id));
r = await anon.post(`/api/foods/${food.id}/reviews`, { rating: 5, comment: 'Nice' });
check('cannot review a pending listing', r.status === 401 || r.status === 404);

/* ------------------------------------------------------------------ */
section('5. Role separation');
for (const [method, url] of [['GET', '/api/admin/dashboard'], ['GET', '/api/admin/foods'], ['GET', '/api/admin/users'], ['GET', '/api/admin/reviews'], ['PUT', `/api/admin/foods/${food.id}/approve`], ['DELETE', `/api/admin/foods/${food.id}`]]) {
  const a = await anon.req(method, url);
  const u = await user.req(method, url);
  check(`${method} ${url} blocked for anon + normal user`, a.status === 401 && u.status === 401);
}
r = await anon.post('/api/admin/login', { email: U1.email, password: U1.password });
check('normal user cannot log in at /admin/login', r.status === 401);
r = await anon.post('/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
check('admin account cannot log in through the public login', r.status === 401);
r = await admin.post('/api/admin/login', { email: ADMIN_EMAIL, password: 'WrongPassword1' });
check('wrong admin password rejected', r.status === 401);
r = await admin.post('/api/admin/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
check('admin login works', r.status === 200 && r.data.admin.role === 'admin');
r = await admin.get('/api/auth/me');
check('admin session is NOT a public-site session', r.status === 401);
r = await admin.get('/api/admin/me');
check('admin /me works', r.status === 200);

/* ------------------------------------------------------------------ */
section('6. Admin approves');
r = await admin.get('/api/admin/dashboard');
check('dashboard has all stats', ['foods', 'pendingFoods', 'approvedFoods', 'rejectedFoods', 'users', 'reviews', 'pendingReviews'].every((k) => typeof r.data.stats[k] === 'number'));
check('dashboard counts the pending listing', r.data.stats.pendingFoods >= 1);
r = await admin.get('/api/admin/foods?status=pending&q=' + stamp);
check('admin sees pending listing with submitter info', r.data.items.length === 1 && r.data.items[0].submittedBy.email === U1.email.toLowerCase());
r = await admin.get('/api/admin/foods?status=demo');
check('admin demo filter works', r.data.total >= 40 && r.data.items.every((x) => x.isDemo));
r = await admin.put(`/api/admin/foods/${food.id}/approve`);
check('approve works -> approved + verified', r.status === 200 && r.data.food.status === 'approved' && r.data.food.isVerified === true);
r = await anon.get('/api/foods?q=' + stamp);
check('approved food now in public list with Verified', r.data.total === 1 && r.data.items[0].isVerified === true && r.data.items[0].isDemo === false);
check('card payload has no private/owner data', !('createdBy' in r.data.items[0]) && !('phone' in r.data.items[0]) && !JSON.stringify(r.data).includes(U1.email));
r = await anon.get('/api/foods?category=noodles&verified=true');
check('appears under its category + Verified filter', r.data.items.some((x) => x.id === food.id) && r.data.items.every((x) => x.isVerified));
r = await anon.get('/api/foods?lat=11.5564&lng=104.9282&radiusKm=5&sort=distance');
check('appears in Nearby', r.data.items.some((x) => x.id === food.id));
r = await anon.get('/api/foods?openNow=true&q=' + stamp);
check('24h place appears in Open Now', r.data.items.length === 1 && r.data.items[0].openStatus.state === 'open');
r = await anon.get(`/api/foods/${food.id}?lat=11.5564&lng=104.9282`);
check('details page data: phone, hours, distance, no owner info', r.status === 200 && r.data.food.phone && r.data.food.businessHours.length === 7 && typeof r.data.food.distanceKm === 'number' && !('createdBy' in r.data.food) && !('status' in r.data.food));

/* ------------------------------------------------------------------ */
section('7. Reviews');
r = await anon.post(`/api/foods/${food.id}/reviews`, { rating: 5, comment: 'Lovely' });
check('must log in to review (401)', r.status === 401);
r = await user.post(`/api/foods/${food.id}/reviews`, { rating: 9, comment: 'x' });
check('invalid rating/comment rejected', r.status === 400);
r = await user.post(`/api/foods/${food.id}/reviews`, { rating: 5, comment: 'Best noodles in town!' });
check('review created', r.status === 201 && r.data.review.userName === U1.name);
const review1 = r.data.review;
r = await user.post(`/api/foods/${food.id}/reviews`, { rating: 3, comment: 'Second try' });
check('one review per user per place (409)', r.status === 409);
r = await user2.post(`/api/foods/${food.id}/reviews`, { rating: 4, comment: 'Good soup, slow service.' });
check('second user review created', r.status === 201);
const review2 = r.data.review;
r = await anon.get(`/api/foods/${food.id}/reviews`);
check('reviews list: count 2, average 4.5', r.data.count === 2 && r.data.average === 4.5 && r.data.items.length === 2);
check('reviews expose name/rating/date/comment only', Object.keys(r.data.items[0]).sort().join() === 'comment,createdAt,id,rating,userName');
r = await anon.get(`/api/foods/${food.id}`);
check('food rating summary updated (4.5 from 2)', r.data.food.ratingAvg === 4.5 && r.data.food.ratingCount === 2);
r = await anon.get('/api/foods?minRating=4&q=' + stamp);
check('rating filter works', r.data.items.length === 1);
r = await anon.get('/api/foods?minRating=5&q=' + stamp);
check('rating filter excludes lower-rated', r.data.items.length === 0);

/* ------------------------------------------------------------------ */
section('8. Review moderation');
r = await admin.get('/api/admin/reviews?q=' + encodeURIComponent('Noodle House ' + stamp));
check('admin sees reviews with restaurant + author + date', r.data.items.length === 2 && r.data.items.every((x) => x.food?.name && x.user?.email && x.createdAt));
r = await admin.get('/api/admin/reviews?q=Dara&rating=4');
check('admin review search by author + rating filter', r.data.items.some((x) => x.id === review2.id));
r = await user2.del(`/api/reviews/${review1.id}`);
check("cannot delete someone else's review", r.status === 404);
r = await admin.del(`/api/admin/reviews/${review2.id}`);
check('admin deletes a review', r.status === 200);
r = await anon.get(`/api/foods/${food.id}/reviews`);
check('deleted review no longer public; average recalculated', r.data.count === 1 && r.data.average === 5);
r = await user.del(`/api/reviews/${review1.id}`);
check('user can delete their own review', r.status === 200);
r = await user2.post(`/api/foods/${food.id}/reviews`, { rating: 4, comment: 'Trying again after deletion.' });
check('can review again after deletion', r.status === 201);

/* ------------------------------------------------------------------ */
section('9. Admin food management');
r = await admin.req('POST', '/api/admin/foods', undefined, { form: await foodForm({ name: `Admin Cafe ${stamp}`, extra: { category: 'cafe-drinks' } }) });
check('admin can add food directly (published + verified)', r.status === 201 && r.data.food.status === 'approved' && r.data.food.isVerified);
const adminFood = r.data.food;
let up = new FormData();
up.append('name', `Admin Cafe Renamed ${stamp}`);
up.append('description', 'Updated description for this lovely cafe.');
up.append('keepImages', JSON.stringify([adminFood.images[0]]));
up.append('images', blob(await img(600, 400, '#16a34a', 'png'), 'image/png'), 'new.png');
r = await admin.req('PUT', `/api/admin/foods/${adminFood.id}`, undefined, { form: up });
check('admin can edit text + swap images', r.status === 200 && r.data.food.name.includes('Renamed') && r.data.food.images.length === 2 && r.data.food.images[0] === adminFood.images[0] && r.data.food.images[1] !== adminFood.images[1], JSON.stringify(r.data));
const removedOk = (await fetch(adminFood.images[1])).status === 404;
check('replaced image file was deleted from disk', removedOk);
up = new FormData(); up.append('keepImages', JSON.stringify([]));
r = await admin.req('PUT', `/api/admin/foods/${adminFood.id}`, undefined, { form: up });
check('cannot drop below 2 images', r.status === 400);
r = await admin.put(`/api/admin/foods/${adminFood.id}/reject`, { reason: 'Duplicate listing' });
check('admin can reject', r.status === 200 && r.data.food.status === 'rejected');
r = await anon.get('/api/foods/' + adminFood.id);
check('rejected listing is hidden', r.status === 404);
r = await admin.get('/api/admin/foods?status=rejected');
check('rejected filter shows it', r.data.items.some((x) => x.id === adminFood.id));
r = await admin.del(`/api/admin/foods/${adminFood.id}`);
check('admin can delete a listing', r.status === 200);
check('its images were removed', (await fetch(adminFood.images[0])).status === 404);

// owner edits send an approved listing back to review
up = new FormData(); up.append('description', 'We now also serve dumplings every day!');
r = await user.req('PUT', `/api/foods/${food.id}`, undefined, { form: up });
check('owner edit allowed and returns listing to pending', r.status === 200 && r.data.food.status === 'pending' && r.data.food.isVerified === false);
r = await anon.get('/api/foods/' + food.id);
check('edited listing is hidden until re-approved', r.status === 404);
r = await user2.req('PUT', `/api/foods/${food.id}`, undefined, { form: up });
check("others cannot edit someone's listing", r.status === 404);
await admin.put(`/api/admin/foods/${food.id}/approve`);

/* ------------------------------------------------------------------ */
section('10. Admin users');
r = await admin.get('/api/admin/users?q=' + stamp);
check('admin lists users (name, email, phone, date, status) — no passwords', r.data.items.length === 2 && r.data.items.every((u) => u.name && u.email && u.createdAt && u.status) && !JSON.stringify(r.data).toLowerCase().includes('password'));
const u2id = r.data.items.find((u) => u.email.startsWith('dara')).id;
r = await admin.get('/api/admin/users/' + u2id);
check('admin can view one user', r.status === 200 && r.data.user.email.startsWith('dara'));
r = await admin.put(`/api/admin/users/${u2id}/status`, { status: 'disabled' });
check('admin disables account', r.status === 200 && r.data.user.status === 'disabled');
r = await user2.get('/api/auth/me');
check('disabled user is locked out immediately', r.status === 401);
r = await anon.post('/api/auth/login', { email: U2.email, password: U2.password });
check('disabled user cannot log in', r.status === 403);
await admin.put(`/api/admin/users/${u2id}/status`, { status: 'active' });
r = await user2.post('/api/auth/login', { email: U2.email, password: U2.password });
check('re-enabled user can log in', r.status === 200);
r = await admin.del('/api/admin/users/' + u2id);
check('admin deletes account', r.status === 200);
r = await anon.get(`/api/foods/${food.id}/reviews`);
check("deleted user's reviews are gone and rating recalculated", r.data.count === 0 || r.data.items.every((x) => x.userName !== U2.name));
r = await admin.get('/api/admin/users/' + u2id);
check('deleted user not found', r.status === 404);

/* ------------------------------------------------------------------ */
section('11. Promotions');
let pf = new FormData();
pf.append('title', 'E2E Promo'); pf.append('description', 'Testing'); pf.append('link', '/category/khmer'); pf.append('status', 'active');
pf.append('image', blob(await img(1600, 700, '#0ea5e9', 'png'), 'image/png'), 'p.png');
r = await admin.req('POST', '/api/admin/promotions', undefined, { form: pf });
check('admin adds a promotion with image', r.status === 201 && r.data.promotion.image.endsWith('.webp'));
const promo = r.data.promotion;
r = await anon.get('/api/promotions');
check('new promotion is public', r.data.items.some((p) => p.id === promo.id));
pf = new FormData(); pf.append('title', 'E2E Promo'); pf.append('link', 'javascript:alert(1)');
r = await admin.req('PUT', '/api/admin/promotions/' + promo.id, undefined, { form: pf });
check('unsafe promotion link rejected', r.status === 400);
pf = new FormData(); pf.append('title', 'E2E Promo Edited'); pf.append('status', 'inactive');
r = await admin.req('PUT', '/api/admin/promotions/' + promo.id, undefined, { form: pf });
check('admin edits + disables promotion', r.status === 200 && r.data.promotion.status === 'inactive');
r = await anon.get('/api/promotions');
check('disabled promotion hidden from carousel', !r.data.items.some((p) => p.id === promo.id) && r.data.items.length === 5);
r = await admin.get('/api/admin/promotions');
const ids = r.data.items.map((p) => p.id);
const reordered = [ids[1], ids[0], ...ids.slice(2)];
r = await admin.put('/api/admin/promotions/reorder', { ids: reordered });
check('admin reorders promotions', r.status === 200 && r.data.items[0].id === ids[1]);
r = await anon.get('/api/promotions');
check('public carousel follows new order', r.data.items[0].id === ids[1]);
await admin.put('/api/admin/promotions/reorder', { ids });
r = await admin.del('/api/admin/promotions/' + promo.id);
check('admin deletes promotion', r.status === 200);
check('promotion image removed from disk', (await fetch(promo.image)).status === 404);

/* ------------------------------------------------------------------ */
section('12. Cleanup + misc');
r = await user.del('/api/foods/' + food.id);
check('owner can delete their listing', r.status === 200);
r = await admin.post('/api/admin/logout');
check('admin logout works', r.status === 200);
r = await admin.get('/api/admin/dashboard');
check('admin blocked after logout', r.status === 401);
r = await anon.get('/api/nothing-here');
check('unknown API route returns JSON 404', r.status === 404 && r.data.message);
r = await anon.req('POST', '/api/auth/login', undefined, { headers: { 'Content-Type': 'application/json' }, form: '{bad json' });
check('malformed JSON handled cleanly (no stack trace)', r.status === 400 && !JSON.stringify(r.data).includes('at '));

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('Failed:\n - ' + failures.join('\n - ')); process.exit(1); }
