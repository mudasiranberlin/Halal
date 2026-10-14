import { Review } from '../models/Review.js';
import { Food } from '../models/Food.js';

/** Recomputes a listing's average rating from its APPROVED reviews. */
export async function recalculateRating(foodId) {
  const rows = await Review.find({ food: foodId, status: 'approved' }).select('rating').lean();
  const count = rows.length;
  const avg = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  await Food.updateOne({ _id: foodId }, { ratingAvg: Math.round(avg * 100) / 100, ratingCount: count });
}
