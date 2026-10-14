import { Promotion } from '../models/Promotion.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicPromotion } from '../utils/serialize.js';

export const listActive = asyncHandler(async (_req, res) => {
  const items = await Promotion.find({ status: 'active' }).sort({ order: 1, createdAt: 1 }).limit(10).lean();
  res.json({ items: items.map(publicPromotion) });
});
