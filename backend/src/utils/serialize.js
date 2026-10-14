import { env } from '../config/env.js';
import { getOpenStatus } from './openStatus.js';
import { haversineKm } from './geo.js';

export const assetUrl = (p) => (!p ? '' : /^https?:\/\//.test(p) ? p : `${env.publicUrl}${p}`);

/** Turns "http://host/uploads/foods/a.webp" back into "/uploads/foods/a.webp". */
export const toStoredPath = (url) => String(url || '').replace(env.publicUrl, '');

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * What the PUBLIC sees. Never includes who submitted the listing (createdBy),
 * rejection notes or any other internal field.
 * Phone/Telegram are the business's own contact details and only appear on the details page.
 */
export function publicFood(f, { loc, detail = false } = {}) {
  const out = {
    id: String(f._id),
    name: f.name,
    category: f.category,
    description: f.description,
    images: (f.images || []).map(assetUrl),
    address: f.address,
    city: f.city,
    latitude: f.latitude,
    longitude: f.longitude,
    priceRange: f.priceRange || '',
    features: f.features || [],
    isDemo: !!f.isDemo,
    isVerified: !!f.isVerified && !f.isDemo,
    ratingAvg: round1(f.ratingAvg || 0),
    ratingCount: f.ratingCount || 0,
    openStatus: getOpenStatus(f.businessHours),
    distanceKm: loc ? Math.round(haversineKm(loc.lat, loc.lng, f.latitude, f.longitude) * 100) / 100 : null,
    createdAt: f.createdAt,
  };
  if (detail) {
    out.phone = f.phone || '';
    out.telegram = f.telegram || '';
    out.businessHours = (f.businessHours || []).map(({ day, isClosed, open, close }) => ({ day, isClosed, open, close }));
  }
  return out;
}

/** The submitter sees their own listing status. */
export function ownerFood(f) {
  return { ...publicFood(f, { detail: true }), status: f.status, rejectionReason: f.rejectionReason || '' };
}

/** Admin-only view (includes who submitted it). */
export function adminFood(f) {
  const by = f.createdBy && typeof f.createdBy === 'object' && f.createdBy.name
    ? { id: String(f.createdBy._id), name: f.createdBy.name, email: f.createdBy.email }
    : null;
  return { ...ownerFood(f), isVerified: !!f.isVerified, submittedBy: by, updatedAt: f.updatedAt };
}

export const publicReview = (r) => ({
  id: String(r._id),
  rating: r.rating,
  comment: r.comment,
  userName: r.user?.name || 'Former user',
  createdAt: r.createdAt,
});

export function adminReview(r) {
  return {
    id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt,
    food: r.food ? { id: String(r.food._id), name: r.food.name } : null,
    user: r.user ? { id: String(r.user._id), name: r.user.name, email: r.user.email } : null,
  };
}

export const publicPromotion = (p) => ({
  id: String(p._id),
  title: p.title,
  description: p.description,
  image: assetUrl(p.image),
  link: p.link || '/',
});

export const adminPromotion = (p) => ({ ...publicPromotion(p), status: p.status, order: p.order, createdAt: p.createdAt });

export const accountUser = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  role: u.role,
  status: u.status,
  createdAt: u.createdAt,
});
