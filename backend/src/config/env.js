import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function fail(message) {
  console.error(`\n❌  Configuration problem: ${message}`);
  console.error('    Copy ".env.example" to ".env" and fill it in (see README).\n');
  process.exit(1);
}

if (!process.env.MONGODB_URI) fail('MONGODB_URI is missing.');
if (!process.env.JWT_SECRET) fail('JWT_SECRET is missing.');
if (process.env.JWT_SECRET.length < 32) fail('JWT_SECRET is too short (use at least 32 characters).');

// Cloudinary is optional: with all three values set, photos are stored there.
// With none set, photos are saved in backend/uploads (fine for local development).
const cloudVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const cloudSet = cloudVars.filter((k) => process.env[k]);
if (cloudSet.length && cloudSet.length < 3) {
  fail(`Cloudinary is only partly set up. Fill in all of: ${cloudVars.join(', ')} (or remove them all).`);
}
const cloudinary = cloudSet.length === 3
  ? {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      apiKey: process.env.CLOUDINARY_API_KEY.trim(),
      apiSecret: process.env.CLOUDINARY_API_SECRET.trim(),
      folder: (process.env.CLOUDINARY_FOLDER || 'food-finder-cambodia').trim().replace(/^\/+|\/+$/g, ''),
    }
  : null;

if (process.env.VERCEL && !cloudSet.length) {
  fail('Photo storage is not set up. Vercel cannot keep uploaded files, so add the three CLOUDINARY_* values in your Vercel project settings.');
}

const list = (v, fallback) =>
  (v || fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, ''),
  cookieSameSite: ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax',
  reviewModeration: process.env.REVIEW_MODERATION === 'true',
  cloudinary, // null = save photos on this server's disk
};
