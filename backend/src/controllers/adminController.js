import { z } from 'zod';
import { Food } from '../models/Food.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { Promotion } from '../models/Promotion.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adminFood, adminReview, adminPromotion, accountUser } from '../utils/serialize.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { checkCredentials } from './authController.js';
import { parseKeepImages } from './foodController.js';
import { createFood, updateFood, removeFood } from '../services/foodService.js';
import { recalculateRating } from '../services/reviewService.js';
import { savePromoImage, deleteImages } from '../services/imageService.js';

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageOf = (req, def = 20) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || def));
  return { page, limit, skip: (page - 1) * limit };
};
const paged = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

/* ------------------------------ session ------------------------------ */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const admin = await checkCredentials(email, password, 'admin');
  setAuthCookie(res, admin, 'admin');
  res.json({ admin: accountUser(admin) });
});

export const logout = (_req, res) => {
  clearAuthCookie(res, 'admin');
  res.json({ message: 'Logged out.' });
};

export const me = (req, res) => res.json({ admin: accountUser(req.admin) });

/* ----------------------------- dashboard ----------------------------- */
export const dashboard = asyncHandler(async (_req, res) => {
  const [total, pending, approved, rejected, demo, users, disabledUsers, reviews, pendingReviews, recentPending, recentReviews] = await Promise.all([
    Food.countDocuments(),
    Food.countDocuments({ status: 'pending' }),
    Food.countDocuments({ status: 'approved' }),
    Food.countDocuments({ status: 'rejected' }),
    Food.countDocuments({ isDemo: true }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', status: 'disabled' }),
    Review.countDocuments(),
    Review.countDocuments({ status: 'pending' }),
    Food.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name email').lean(),
    Review.find().sort({ createdAt: -1 }).limit(5).populate('food', 'name').populate('user', 'name email').lean(),
  ]);
  res.json({
    stats: { foods: total, pendingFoods: pending, approvedFoods: approved, rejectedFoods: rejected, demoFoods: demo, users, disabledUsers, reviews, pendingReviews },
    recentPending: recentPending.map(adminFood),
    recentReviews: recentReviews.map(adminReview),
  });
});

/* ------------------------------- foods ------------------------------- */
export const listFoods = asyncHandler(async (req, res) => {
  const p = pageOf(req);
  const filter = {};
  const { status, q } = req.query;
  if (status === 'demo') filter.isDemo = true;
  else if (['pending', 'approved', 'rejected'].includes(status)) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRx(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { address: rx }, { city: rx }];
  }
  const [rows, total] = await Promise.all([
    Food.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('createdBy', 'name email').lean(),
    Food.countDocuments(filter),
  ]);
  res.json(paged(rows.map(adminFood), total, p));
});

const findFood = async (id) => {
  const food = await Food.findById(id);
  if (!food) throw new AppError(404, 'Listing not found.');
  return food;
};

export const getFood = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).populate('createdBy', 'name email');
  if (!food) throw new AppError(404, 'Listing not found.');
  res.json({ food: adminFood(food) });
});

export const createFoodAdmin = asyncHandler(async (req, res) => {
  const food = await createFood({ data: req.validated.body, files: req.files, createdBy: req.admin._id, byAdmin: true });
  res.status(201).json({ food: adminFood(food), message: 'Listing created and published.' });
});

export const updateFoodAdmin = asyncHandler(async (req, res) => {
  const food = await findFood(req.params.id);
  await updateFood(food, req.validated.body, { files: req.files, keepImages: parseKeepImages(req.body.keepImages) });
  await food.populate('createdBy', 'name email');
  res.json({ food: adminFood(food), message: 'Listing updated.' });
});

export const approveFood = asyncHandler(async (req, res) => {
  const food = await findFood(req.params.id);
  food.status = 'approved';
  food.isVerified = !food.isDemo; // community listings get the Verified badge when approved
  food.rejectionReason = '';
  await food.save();
  res.json({ food: adminFood(food), message: 'Listing approved. It is now public.' });
});

export const rejectFood = asyncHandler(async (req, res) => {
  const food = await findFood(req.params.id);
  food.status = 'rejected';
  food.isVerified = false;
  food.rejectionReason = String(req.body?.reason || '').trim().slice(0, 300);
  await food.save();
  res.json({ food: adminFood(food), message: 'Listing rejected.' });
});

export const deleteFood = asyncHandler(async (req, res) => {
  await removeFood(await findFood(req.params.id));
  res.json({ message: 'Listing deleted.' });
});

/* ------------------------------ reviews ------------------------------ */
export const listReviews = asyncHandler(async (req, res) => {
  const p = pageOf(req);
  const { status, rating, q } = req.query;
  const filter = {};
  if (['approved', 'pending'].includes(status)) filter.status = status;
  if (['1', '2', '3', '4', '5'].includes(rating)) filter.rating = Number(rating);
  if (q) {
    const rx = new RegExp(escapeRx(String(q).slice(0, 80)), 'i');
    const [foods, users] = await Promise.all([
      Food.find({ name: rx }).select('_id').lean(),
      User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean(),
    ]);
    filter.$or = [{ comment: rx }, { food: { $in: foods.map((f) => f._id) } }, { user: { $in: users.map((u) => u._id) } }];
  }
  const [rows, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('food', 'name').populate('user', 'name email').lean(),
    Review.countDocuments(filter),
  ]);
  res.json(paged(rows.map(adminReview), total, p));
});

export const approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError(404, 'Review not found.');
  review.status = 'approved';
  await review.save();
  await recalculateRating(review.food);
  res.json({ message: 'Review approved.' });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError(404, 'Review not found.');
  await review.deleteOne();
  await recalculateRating(review.food);
  res.json({ message: 'Review deleted. It no longer appears publicly.' });
});

/* ------------------------------- users ------------------------------- */
export const listUsers = asyncHandler(async (req, res) => {
  const p = pageOf(req);
  const filter = { role: 'user' };
  const { status, q } = req.query;
  if (['active', 'disabled'].includes(status)) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRx(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    User.countDocuments(filter),
  ]);
  const items = await Promise.all(
    rows.map(async (u) => ({
      ...accountUser(u),
      lastLoginAt: u.lastLoginAt || null,
      foodCount: await Food.countDocuments({ createdBy: u._id }),
      reviewCount: await Review.countDocuments({ user: u._id }),
    }))
  );
  res.json(paged(items, total, p));
});

const findUser = async (id) => {
  const user = await User.findById(id);
  if (!user || user.role !== 'user') throw new AppError(404, 'User not found.');
  return user;
};

export const getUser = asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  const [foods, reviews] = await Promise.all([
    Food.find({ createdBy: user._id }).sort({ createdAt: -1 }).limit(20).select('name status createdAt').lean(),
    Review.countDocuments({ user: user._id }),
  ]);
  res.json({
    user: { ...accountUser(user), lastLoginAt: user.lastLoginAt || null, reviewCount: reviews },
    foods: foods.map((f) => ({ id: String(f._id), name: f.name, status: f.status, createdAt: f.createdAt })),
  });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const parsed = z.object({ status: z.enum(['active', 'disabled']) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Status must be active or disabled.');
  const user = await findUser(req.params.id);
  user.status = parsed.data.status;
  await user.save();
  res.json({ user: accountUser(user), message: user.status === 'disabled' ? 'Account disabled.' : 'Account enabled.' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  // Their reviews and unpublished submissions are removed; published listings stay but lose the link to the person.
  const reviews = await Review.find({ user: user._id }).select('food').lean();
  await Review.deleteMany({ user: user._id });
  await Promise.all([...new Set(reviews.map((r) => String(r.food)))].map(recalculateRating));
  const unpublished = await Food.find({ createdBy: user._id, status: { $ne: 'approved' } });
  for (const f of unpublished) await removeFood(f);
  await Food.updateMany({ createdBy: user._id }, { $set: { createdBy: null } });
  await user.deleteOne();
  res.json({ message: 'Account deleted.' });
});

/* ---------------------------- promotions ---------------------------- */
export const listPromotions = asyncHandler(async (_req, res) => {
  const items = await Promotion.find().sort({ order: 1, createdAt: 1 }).lean();
  res.json({ items: items.map(adminPromotion) });
});

export const createPromotion = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Please choose an image for the promotion.', { image: 'Image is required' });
  const image = await savePromoImage(req.file);
  try {
    const last = await Promotion.findOne().sort({ order: -1 }).select('order').lean();
    const promo = await Promotion.create({ ...req.validated.body, image, order: (last?.order ?? -1) + 1 });
    res.status(201).json({ promotion: adminPromotion(promo), message: 'Promotion added.' });
  } catch (err) {
    await deleteImages([image]);
    throw err;
  }
});

export const updatePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new AppError(404, 'Promotion not found.');
  Object.assign(promo, req.validated.body);
  let oldImage;
  if (req.file) {
    oldImage = promo.image;
    promo.image = await savePromoImage(req.file);
  }
  await promo.save();
  if (oldImage) await deleteImages([oldImage]);
  res.json({ promotion: adminPromotion(promo), message: 'Promotion updated.' });
});

export const deletePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new AppError(404, 'Promotion not found.');
  await promo.deleteOne();
  await deleteImages([promo.image]);
  res.json({ message: 'Promotion deleted.' });
});

export const reorderPromotions = asyncHandler(async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'string')) throw new AppError(400, 'Invalid order.');
  await Promise.all(ids.map((id, order) => Promotion.updateOne({ _id: id }, { order })));
  const items = await Promotion.find().sort({ order: 1, createdAt: 1 }).lean();
  res.json({ items: items.map(adminPromotion), message: 'Order saved.' });
});
