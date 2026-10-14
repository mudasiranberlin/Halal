import { Food } from '../models/Food.js';
import { Review } from '../models/Review.js';
import { CATEGORIES } from '../config/categories.js';
import { AppError } from '../utils/AppError.js';
import { haversineKm } from '../utils/geo.js';
import { getOpenStatus } from '../utils/openStatus.js';
import { publicFood, toStoredPath } from '../utils/serialize.js';
import { saveImages, deleteImages } from './imageService.js';

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Public listing search: approved listings only. */
export async function listPublicFoods(query) {
  const { q, category, city, minRating, openNow, verified, lat, lng, radiusKm, sort, page, limit } = query;
  const loc = lat != null && lng != null ? { lat, lng } : null;

  const filter = { status: 'approved' };
  if (category) filter.category = category;
  if (city) filter.city = city;
  if (verified === 'true') filter.isVerified = true;
  if (minRating) filter.ratingAvg = { $gte: minRating };
  if (q) {
    const rx = new RegExp(escapeRx(q), 'i');
    const catSlugs = CATEGORIES.filter((c) => rx.test(c.label) || rx.test(c.slug)).map((c) => c.slug);
    filter.$or = [{ name: rx }, { description: rx }, { address: rx }, { city: rx }];
    if (catSlugs.length) filter.$or.push({ category: { $in: catSlugs } });
  }

  const docs = await Food.find(filter).select('-createdBy -rejectionReason -phone -telegram').lean();

  let rows = docs.map((d) => ({
    d,
    dist: loc ? haversineKm(loc.lat, loc.lng, d.latitude, d.longitude) : null,
    open: getOpenStatus(d.businessHours),
  }));
  if (openNow === 'true') rows = rows.filter((r) => r.open.state === 'open');
  if (loc && radiusKm) rows = rows.filter((r) => r.dist <= radiusKm);

  const mode = sort || (loc && radiusKm ? 'distance' : 'popular');
  const byNew = (a, b) => new Date(b.d.createdAt) - new Date(a.d.createdAt);
  const sorters = {
    distance: (a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity),
    rating: (a, b) => b.d.ratingAvg - a.d.ratingAvg || b.d.ratingCount - a.d.ratingCount || byNew(a, b),
    newest: byNew,
    // rated places first, then real (non-demo) listings, then newest
    popular: (a, b) =>
      (b.d.ratingCount > 0) - (a.d.ratingCount > 0) ||
      b.d.ratingAvg - a.d.ratingAvg ||
      Number(a.d.isDemo) - Number(b.d.isDemo) ||
      byNew(a, b),
  };
  rows.sort(sorters[mode === 'distance' && !loc ? 'popular' : mode]);

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const slice = rows.slice((page - 1) * limit, page * limit);
  return { items: slice.map((r) => publicFood(r.d, { loc })), total, page, pages, limit };
}

export async function categoryCounts() {
  const rows = await Food.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return CATEGORIES.map((c) => ({ ...c, count: map[c.slug] || 0 }));
}

function checkPhone(isDemo, phone) {
  if (!isDemo && !phone) throw new AppError(400, 'Please check the highlighted fields.', { phone: 'Phone number is required' });
}

export async function createFood({ data, files, createdBy, byAdmin }) {
  if (!files || files.length < 2 || files.length > 3) {
    throw new AppError(400, 'Please upload 2 or 3 photos.', { images: 'Please upload 2 or 3 photos.' });
  }
  checkPhone(false, data.phone);
  const images = await saveImages(files, 'foods');
  try {
    return await Food.create({
      ...data,
      images,
      createdBy,
      status: byAdmin ? 'approved' : 'pending',
      isVerified: !!byAdmin,
    });
  } catch (err) {
    await deleteImages(images);
    throw err;
  }
}

/**
 * Updates a listing. `keepImages` is the list of existing image URLs to keep;
 * `files` are new uploads. Returns the saved document.
 */
export async function updateFood(food, data, { files = [], keepImages, resetToPending = false } = {}) {
  Object.assign(food, data);
  checkPhone(food.isDemo, food.phone);

  const before = [...food.images];
  let images = before;
  if (Array.isArray(keepImages)) {
    const keep = new Set(keepImages.map(toStoredPath));
    images = before.filter((p) => keep.has(p));
  }
  const total = images.length + files.length;
  const bad = food.isDemo ? total > 3 : total < 2 || total > 3;
  if (bad) throw new AppError(400, 'A listing needs 2 or 3 photos.', { images: 'A listing needs 2 or 3 photos.' });

  const added = files.length ? await saveImages(files, 'foods') : [];
  food.images = [...images, ...added];
  if (resetToPending) {
    food.status = 'pending';
    food.isVerified = false;
    food.rejectionReason = '';
  }
  try {
    await food.save();
  } catch (err) {
    await deleteImages(added);
    throw err;
  }
  await deleteImages(before.filter((p) => !food.images.includes(p)));
  return food;
}

export async function removeFood(food) {
  await Review.deleteMany({ food: food._id });
  await food.deleteOne();
  await deleteImages(food.images);
}
