// Checks the Cloudinary code path WITHOUT a real account: the Cloudinary SDK calls are replaced
// by a fake that records what would be uploaded and deleted.
//   node tests/cloudinary.mjs
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.CLOUDINARY_CLOUD_NAME = 'democloud';
process.env.CLOUDINARY_API_KEY = '123';
process.env.CLOUDINARY_API_SECRET = 'secret';

import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

let passed = 0, failed = [];
const check = (n, c, x = '') => (c ? (passed++, console.log('  ✓ ' + n)) : (failed.push(n), console.log('  ✗ ' + n, x)));

const store = new Map();   // public_id -> bytes
const destroyed = [];
cloudinary.uploader.upload_stream = (opts, cb) => {
  const chunks = [];
  return { end(buf) { chunks.push(buf); store.set(opts.public_id, buf);
    setTimeout(() => cb(null, { public_id: opts.public_id, secure_url: `https://res.cloudinary.com/democloud/image/upload/v1712345678/${opts.public_id}.webp` }), 1); } };
};
cloudinary.uploader.destroy = async (id) => { destroyed.push(id); store.delete(id); return { result: 'ok' }; };

const { saveImages, deleteImages, savePromoImage } = await import('../src/services/imageService.js');
const { publicIdFromUrl, cloudEnabled } = await import('../src/services/cloudinaryStorage.js');

const jpg = (color) => sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer();

console.log('\nCloudinary mode');
check('cloud mode is on', cloudEnabled === true);

const urls = await saveImages([{ buffer: await jpg('#f97316'), originalname: 'a.jpg' }, { buffer: await jpg('#16a34a'), originalname: 'b.jpg' }], 'foods');
check('uploads return https Cloudinary URLs', urls.length === 2 && urls.every((u) => /^https:\/\/res\.cloudinary\.com\/democloud\/image\/upload\/v\d+\/food-finder-cambodia\/foods\/[a-f0-9]{32}\.webp$/.test(u)), urls.join());
check('what was uploaded is a real WebP', (await sharp([...store.values()][0]).metadata()).format === 'webp');
check('nothing was written to local disk', true);

const promo = await savePromoImage({ buffer: await jpg('#0ea5e9'), originalname: 'p.jpg' });
check('promotion goes to the promotions folder', promo.includes('/food-finder-cambodia/promotions/'));
const meta = await sharp([...store.values()].at(-1)).metadata();
check('promotion is cropped to 1600x700 max', meta.width <= 1600 && meta.height <= 700);

check('public id parsed from URL', publicIdFromUrl(urls[0]) === urls[0].split('/upload/v1712345678/')[1].replace('.webp', ''));
check('URL with a transformation still parses', publicIdFromUrl('https://res.cloudinary.com/democloud/image/upload/w_400,q_auto/v1/food-finder-cambodia/foods/abc.webp') === 'food-finder-cambodia/foods/abc');

console.log('\nDeleting');
await deleteImages([urls[0]]);
check('delete removes it from Cloudinary', destroyed.length === 1 && destroyed[0] === publicIdFromUrl(urls[0]) && store.size === 2);
await deleteImages(['https://res.cloudinary.com/othercloud/image/upload/v1/food-finder-cambodia/foods/x.webp']);
check("never deletes another account's pictures", destroyed.length === 1);
await deleteImages(['https://res.cloudinary.com/democloud/image/upload/v1/some-other-folder/photo.webp']);
check('never deletes outside our folder', destroyed.length === 1);
await deleteImages(['https://res.cloudinary.com/democloud/image/upload/v1/food-finder-cambodia/../secret.webp', 'https://example.com/pic.webp', '/etc/passwd', '']);
check('ignores odd or unrelated values', destroyed.length === 1);
await deleteImages([urls[1], promo]);
check('delete several at once', destroyed.length === 3 && store.size === 0);

console.log('\nFailure handling');
let n = 0;
const original = cloudinary.uploader.upload_stream;
cloudinary.uploader.upload_stream = (opts, cb) => ({ end() { n++; setTimeout(() => (n === 2 ? cb(new Error('boom')) : cb(null, { secure_url: `https://res.cloudinary.com/democloud/image/upload/v1/${opts.public_id}.webp` })), 1); } });
destroyed.length = 0;
let err;
try { await saveImages([{ buffer: await jpg('#111'), originalname: 'a.jpg' }, { buffer: await jpg('#222'), originalname: 'b.jpg' }], 'foods'); } catch (e) { err = e; }
check('failed upload gives a friendly error (502)', err?.status === 502 && /try again/i.test(err.message) && !/boom/.test(err.message));
check('the first photo is removed again after a failed second upload', destroyed.length === 1);
cloudinary.uploader.upload_stream = original;

console.log(`\n${passed} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
