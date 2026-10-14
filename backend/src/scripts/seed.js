// Fills the database with demo listings and the 5 starter promotions.
//   npm run seed          (safe to run again: it will not duplicate anything)
//   npm run seed:reset    (removes the old demo listings/promotions first)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Food } from '../models/Food.js';
import { Promotion } from '../models/Promotion.js';
import { Review } from '../models/Review.js';
import { savePromoImage, deleteImages } from '../services/imageService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SEED_PROMOS = path.resolve(here, '../../seed/promos');

const areas = [
  ['Phnom Penh', 11.5564, 104.9282], ['Siem Reap', 13.3633, 103.8564], ['Battambang', 13.0957, 103.2022],
  ['Kampot', 10.6104, 104.1815], ['Sihanoukville', 10.6253, 103.5234], ['Kep', 10.4829, 104.3167],
  ['Kampong Cham', 11.9934, 105.4635], ['Kampong Chhnang', 12.25, 104.6667], ['Pursat', 12.5388, 103.9192],
  ['Kampong Thom', 12.7111, 104.8887], ['Kratie', 12.4881, 106.0188], ['Mondulkiri / Sen Monorom', 12.4558, 107.1881],
  ['Ratanakiri / Banlung', 13.7394, 106.9873], ['Takeo', 10.9908, 104.784], ['Svay Rieng', 11.0879, 105.7993],
  ['Poipet', 13.6561, 102.5625], ['Koh Kong', 11.6153, 102.9838], ['Kampong Speu', 11.4533, 104.5209],
];

const dishes = [
  'Khmer Beef Lok Lak', 'Fish Amok', 'Beef Kuy Teav', 'Nom Banh Chok', 'Bai Sach Chrouk', 'Prahok Ktis',
  'Kampot Pepper Crab', 'Khmer Red Curry', 'Chicken Char Kroeung', 'Num Pang Sandwich', 'Fried Spring Rolls',
  'Lort Cha', 'Banh Chhev', 'Samlor Korkor', 'Kuy Teav Phnom Penh', 'Grilled Pork Skewers', 'Green Mango Salad',
  'Fried Rice', 'Chicken Wings', 'Beef Skewers', 'Coconut Pancakes', 'Num Ansom', 'Num Krok', 'Tuk Kreung',
  'Iced Khmer Coffee', 'Sugarcane Juice', 'Mango Sticky Rice', 'Grilled River Fish', 'Fried Banana', 'BBQ Seafood',
  'Chicken Rice', 'Pork Noodle Soup', 'Papaya Salad', 'Beef Soup', 'Crispy Duck', 'Pandan Waffles',
  'Coconut Ice Cream', 'Durian Dessert', 'Fresh Fruit Shake', 'Roasted Chicken',
];

const places = ['Central Market area', 'Riverside', 'Old Market', 'Night Market', 'Local food street', 'City centre', 'Market food stalls', 'Riverside food lane'];

function categoryOf(name) {
  const low = name.toLowerCase();
  if (low.includes('coffee') || low.includes('juice') || low.includes('shake')) return 'cafe-drinks';
  if (/dessert|ice cream|banana|pancake|waffle|sticky rice/.test(low)) return 'desserts';
  if (/crab|fish|seafood/.test(low)) return 'seafood';
  if (/kuy teav|noodle|lort cha/.test(low)) return 'noodles';
  if (/skewer|num pang/.test(low)) return 'street-food';
  return 'khmer';
}

// Typical opening hours by kind of place. Street food stays open past midnight on purpose.
const hoursFor = {
  'cafe-drinks': ['07:00', '21:00'],
  desserts: ['11:00', '22:00'],
  seafood: ['10:00', '22:00'],
  noodles: ['06:00', '14:00'],
  'street-food': ['17:00', '01:00'],
  khmer: ['08:00', '21:00'],
};

const buildHours = (cat, i) =>
  Array.from({ length: 7 }, (_, day) => {
    const [open, close] = hoursFor[cat];
    return { day, isClosed: i % 9 === 0 && day === 1, open, close }; // a few places rest on Mondays
  });

const promos = [
  { file: 'promo-1-khmer.webp', title: 'Discover Khmer Food', description: 'Amok, lok lak and red curry, cooked the way grandma does it.', link: '/category/khmer' },
  { file: 'promo-2-street.webp', title: 'Best Street Food in Cambodia', description: 'Sizzling skewers and night-market bites you will want seconds of.', link: '/category/street-food' },
  { file: 'promo-3-seafood.webp', title: 'Seafood Near You', description: 'Fresh crab, grilled fish and coastal favourites close by.', link: '/nearby' },
  { file: 'promo-4-cafe.webp', title: 'Café & Drinks', description: 'Iced Khmer coffee, fruit shakes and cosy places to sit down.', link: '/category/cafe-drinks' },
  { file: 'promo-5-discover.webp', title: 'Discover New Food Spots', description: 'Know a hidden gem? Add it and help others find it.', link: '/add-food' },
];

async function seedPromotions(reset) {
  if (reset) {
    const old = await Promotion.find().lean();
    await Promotion.deleteMany({});
    await deleteImages(old.map((p) => p.image));
  }
  if (await Promotion.countDocuments()) {
    console.log('• Promotions already exist, skipping (use --reset to recreate).');
    return;
  }
  for (const [order, p] of promos.entries()) {
    // Same path as an admin upload: goes to Cloudinary when it is set up, otherwise to backend/uploads.
    const buffer = await fs.readFile(path.join(SEED_PROMOS, p.file));
    const image = await savePromoImage({ buffer, originalname: p.file });
    await Promotion.create({ title: p.title, description: p.description, link: p.link, image, order, status: 'active' });
  }
  console.log(`✓ Created ${promos.length} promotions`);
}

async function seedFoods(reset) {
  if (reset) {
    const demo = await Food.find({ isDemo: true }).select('_id').lean();
    await Review.deleteMany({ food: { $in: demo.map((d) => d._id) } });
    await Food.deleteMany({ isDemo: true });
  }
  if (await Food.countDocuments({ isDemo: true })) {
    console.log('• Demo listings already exist, skipping (use --reset to recreate).');
    return;
  }
  const docs = dishes.map((name, i) => {
    const a = areas[i % areas.length];
    const category = categoryOf(name);
    const place = places[i % places.length];
    return {
      name,
      category,
      city: a[0],
      address: `${place}, ${a[0]}`,
      description: `Illustrative discovery listing in ${a[0]}. This is not a verified vendor or exact storefront. Confirm the place before traveling.`,
      latitude: a[1] + ((i % 5) - 2) * 0.001,
      longitude: a[2] + ((i % 5) - 2) * 0.001,
      businessHours: buildHours(category, i),
      priceRange: ['$', '$$', '$'][i % 3],
      features: [['Takeaway'], ['Family friendly', 'Air-con'], ['Outdoor seating']][i % 3],
      images: [],
      status: 'approved',
      isDemo: true,
      isVerified: false,
      createdBy: null,
    };
  });
  await Food.insertMany(docs);
  console.log(`✓ Created ${docs.length} demo listings (labelled "Demo Listing" on the site)`);
}

const reset = process.argv.includes('--reset');
await connectDB();
await seedPromotions(reset);
await seedFoods(reset);
await mongoose.disconnect();
console.log('Done.');
