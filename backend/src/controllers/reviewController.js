import { Review } from '../models/Review.js';
import { Food } from '../models/Food.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicReview } from '../utils/serialize.js';
import { recalculateRating } from '../services/reviewService.js';

export const listForFood = asyncHandler(async (req, res) => {
  const food = await Food.findOne({ _id: req.params.id, status: 'approved' }).select('_id').lean();
  if (!food) throw new AppError(404, 'This place could not be found.');
  const all = await Review.find({ food: food._id, status: 'approved' }).sort({ createdAt: -1 }).populate('user', 'name').lean();
  const count = all.length;
  const average = count ? Math.round((all.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: all.filter((r) => r.rating === star).length }));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  res.json({
    items: all.slice((page - 1) * limit, page * limit).map(publicReview),
    count,
    average,
    distribution,
    page,
    pages: Math.max(1, Math.ceil(count / limit)),
  });
});

export const create = asyncHandler(async (req, res) => {
  const food = await Food.findOne({ _id: req.params.id, status: 'approved' }).select('_id').lean();
  if (!food) throw new AppError(404, 'This place could not be found.');
  const { rating, comment } = req.validated.body;
  if (await Review.exists({ food: food._id, user: req.user._id })) {
    throw new AppError(409, 'You have already reviewed this place.');
  }
  const status = env.reviewModeration ? 'pending' : 'approved';
  const review = await Review.create({ food: food._id, user: req.user._id, rating, comment, status });
  await recalculateRating(food._id);
  res.status(201).json({
    review: publicReview({ ...review.toObject(), user: { name: req.user.name } }),
    status,
    message: status === 'pending' ? 'Thanks! Your review will appear after it has been approved.' : 'Thanks for sharing your review!',
  });
});

export const removeOwn = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || String(review.user) !== String(req.user._id)) throw new AppError(404, 'Review not found.');
  await review.deleteOne();
  await recalculateRating(review.food);
  res.json({ message: 'Your review was deleted.' });
});
