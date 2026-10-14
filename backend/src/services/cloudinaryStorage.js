import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

const cfg = env.cloudinary;
export const cloudEnabled = !!cfg;

if (cfg) {
  cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret, secure: true });
}

/** Uploads one processed image (a Buffer) and returns its https URL. */
export function uploadToCloud(buffer, folder, name) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      // The full path goes in public_id so it works with both Cloudinary folder modes.
      { public_id: `${cfg.folder}/${folder}/${name}`, resource_type: 'image', overwrite: false, invalidate: true },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

/**
 * Works out the Cloudinary public_id of a stored URL, but only for pictures THIS app
 * uploaded (right account, inside our folder). Anything else returns null and is never deleted.
 */
export function publicIdFromUrl(url) {
  if (!cfg) return null;
  const text = String(url || '');
  // Normal case: .../upload/[transformations/]v123456/<public id>.<ext>
  const m =
    /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:[^/]+\/)*?v\d+\/(.+?)\.[a-z0-9]+$/i.exec(text) ||
    /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+?)\.[a-z0-9]+$/i.exec(text);
  if (!m || m[1] !== cfg.cloudName) return null;
  const id = decodeURIComponent(m[2]);
  return id.startsWith(`${cfg.folder}/`) && !id.includes('..') ? id : null;
}

export const isCloudUrl = (url) => /^https:\/\/res\.cloudinary\.com\//i.test(String(url || ''));

/** Deletes one picture from Cloudinary. Returns true when it is gone (or was already gone). */
export async function deleteFromCloud(url) {
  const id = publicIdFromUrl(url);
  if (!id) return false;
  try {
    const r = await cloudinary.uploader.destroy(id, { resource_type: 'image', invalidate: true });
    return r.result === 'ok' || r.result === 'not found';
  } catch (err) {
    console.error(`Could not delete ${id} from Cloudinary:`, err.message);
    return false;
  }
}
