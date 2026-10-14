/**
 * Shrinks a photo in the browser before upload.
 * Phone photos are often 4-10 MB; some hosts (like Vercel) reject requests over ~4.5 MB,
 * and smaller uploads are faster on mobile data anyway. If anything goes wrong we simply
 * return the original file and let the server deal with it.
 */
export async function compressImage(file, { maxSide = 1600, quality = 0.82 } = {}) {
  try {
    if (!file?.type?.startsWith('image/') || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = await toBlob('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg'); // older Safari cannot encode WebP
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

/** Total request size we allow (Vercel's limit is about 4.5 MB). */
export const MAX_TOTAL_UPLOAD = 4 * 1024 * 1024;
