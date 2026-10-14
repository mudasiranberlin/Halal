import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { AppError } from '../utils/AppError.js';
import { cloudEnabled, uploadToCloud, deleteFromCloud, isCloudUrl } from './cloudinaryStorage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(here, '../../uploads');
const FOLDERS = new Set(['foods', 'promotions']);
const ALLOWED = new Set(['jpeg', 'png', 'webp']);

/**
 * Safely stores one uploaded image.
 * - decodes the file for real (a renamed .exe/.html/.svg is rejected)
 * - fixes phone-camera rotation, strips EXIF data (including GPS)
 * - resizes and converts to WebP
 * - uses a random file name (never the user's file name)
 */
async function saveOne(file, folder, { width, height, fit }) {
  let meta;
  try {
    meta = await sharp(file.buffer, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new AppError(400, `"${file.originalname}" is not a valid image.`, { images: 'Please upload real JPG, PNG or WebP images.' });
  }
  if (!ALLOWED.has(meta.format)) {
    throw new AppError(400, 'Only JPG, PNG or WebP images are allowed.', { images: 'Only JPG, PNG or WebP images are allowed.' });
  }
  const name = `${crypto.randomBytes(16).toString('hex')}.webp`;
  const pipeline = sharp(file.buffer, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width, height, fit, withoutEnlargement: true })
    .webp({ quality: 80 });

  if (cloudEnabled) {
    const buffer = await pipeline.toBuffer();
    try {
      return await uploadToCloud(buffer, folder, name.replace(/\.webp$/, ''));
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      throw new AppError(502, 'We could not upload your photo right now. Please try again in a moment.', { images: 'Photo upload failed. Please try again.' });
    }
  }
  await pipeline.toFile(path.join(UPLOAD_ROOT, folder, name));
  return `/uploads/${folder}/${name}`;
}

export async function saveImages(files, folder, opts = { width: 1280, height: 1280, fit: 'inside' }) {
  if (!FOLDERS.has(folder)) throw new Error('Invalid upload folder');
  if (!cloudEnabled) await fs.mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
  const saved = [];
  try {
    for (const f of files) saved.push(await saveOne(f, folder, opts));
    return saved;
  } catch (err) {
    await deleteImages(saved);
    throw err;
  }
}

export const savePromoImage = (file) => saveImages([file], 'promotions', { width: 1600, height: 700, fit: 'cover' }).then((r) => r[0]);

/** Removes pictures from Cloudinary or from disk, depending on where each one is stored. */
export async function deleteImages(paths = []) {
  await Promise.all(
    paths.map(async (p) => {
      if (isCloudUrl(p)) return deleteFromCloud(p); // only ever deletes pictures this app uploaded
      const m = /^\/uploads\/(foods|promotions)\/([a-f0-9]{32}\.webp)$/.exec(p || '');
      if (!m) return undefined; // only ever delete files we created ourselves
      try {
        await fs.unlink(path.join(UPLOAD_ROOT, m[1], m[2]));
      } catch {
        /* already gone */
      }
      return undefined;
    })
  );
}
