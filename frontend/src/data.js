// Shared constants and small helpers. Category list mirrors backend/src/config/categories.js.
export const areas = [
  ['Phnom Penh', 11.5564, 104.9282], ['Siem Reap', 13.3633, 103.8564], ['Battambang', 13.0957, 103.2022],
  ['Kampot', 10.6104, 104.1815], ['Sihanoukville', 10.6253, 103.5234], ['Kep', 10.4829, 104.3167],
  ['Kampong Cham', 11.9934, 105.4635], ['Kampong Chhnang', 12.25, 104.6667], ['Pursat', 12.5388, 103.9192],
  ['Kampong Thom', 12.7111, 104.8887], ['Kratie', 12.4881, 106.0188], ['Mondulkiri / Sen Monorom', 12.4558, 107.1881],
  ['Ratanakiri / Banlung', 13.7394, 106.9873], ['Takeo', 10.9908, 104.784], ['Svay Rieng', 11.0879, 105.7993],
  ['Poipet', 13.6561, 102.5625], ['Koh Kong', 11.6153, 102.9838], ['Kampong Speu', 11.4533, 104.5209],
];

export const categories = [
  { slug: 'khmer', label: 'Khmer', emoji: '🍛', tint: '#f97316' },
  { slug: 'noodles', label: 'Noodles', emoji: '🍜', tint: '#eab308' },
  { slug: 'street-food', label: 'Street Food', emoji: '🍢', tint: '#ef4444' },
  { slug: 'seafood', label: 'Seafood', emoji: '🦀', tint: '#0ea5e9' },
  { slug: 'cafe-drinks', label: 'Café & Drinks', emoji: '☕', tint: '#a16207' },
  { slug: 'desserts', label: 'Desserts', emoji: '🍧', tint: '#ec4899' },
];

export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
export const categoryLabel = (slug) => categoryBySlug[slug]?.label || slug;

export const FEATURES = ['Wi-Fi', 'Air-con', 'Parking', 'Delivery', 'Takeaway', 'Outdoor seating', 'Halal', 'Vegetarian options', 'Card payment', 'Family friendly'];

function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Friendly illustrated picture used when a listing has no photo (e.g. demo listings). */
export function placeholderImg(name, categorySlug) {
  const hue = hueFromString(name || categorySlug || 'food');
  const emoji = categoryBySlug[categorySlug]?.emoji || '🍽️';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},58%,90%)"/><stop offset="1" stop-color="hsl(${(hue + 45) % 360},52%,74%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="50%" y="54%" font-size="112" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const foodImages = (f) => (f.images && f.images.length ? f.images : [placeholderImg(f.name, f.category)]);

export function dist(f, loc) {
  if (!loc || !Number.isFinite(+f.latitude) || !Number.isFinite(+f.longitude)) return null;
  const rad = (x) => (x * Math.PI) / 180;
  const d1 = +f.latitude - loc.lat;
  const d2 = +f.longitude - loc.lng;
  const a = Math.sin(rad(d1) / 2) ** 2 + Math.cos(rad(loc.lat)) * Math.cos(rad(+f.latitude)) * Math.sin(rad(d2) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function mapsUrl(f) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.latitude + ',' + f.longitude)}`;
}
