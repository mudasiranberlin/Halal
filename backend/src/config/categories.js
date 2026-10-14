// Single source of truth for categories (the frontend mirrors this list).
export const CATEGORIES = [
  { slug: 'khmer', label: 'Khmer', emoji: '🍛' },
  { slug: 'noodles', label: 'Noodles', emoji: '🍜' },
  { slug: 'street-food', label: 'Street Food', emoji: '🍢' },
  { slug: 'seafood', label: 'Seafood', emoji: '🦀' },
  { slug: 'cafe-drinks', label: 'Café & Drinks', emoji: '☕' },
  { slug: 'desserts', label: 'Desserts', emoji: '🍧' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export const PROVINCES = [
  'Phnom Penh', 'Siem Reap', 'Battambang', 'Kampot', 'Sihanoukville', 'Kep', 'Kampong Cham',
  'Kampong Chhnang', 'Pursat', 'Kampong Thom', 'Kratie', 'Mondulkiri / Sen Monorom',
  'Ratanakiri / Banlung', 'Takeo', 'Svay Rieng', 'Poipet', 'Koh Kong', 'Kampong Speu',
];

export const FEATURES = [
  'Wi-Fi', 'Air-con', 'Parking', 'Delivery', 'Takeaway', 'Outdoor seating',
  'Halal', 'Vegetarian options', 'Card payment', 'Family friendly',
];
