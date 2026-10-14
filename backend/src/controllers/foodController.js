import { Food } from '../models/Food.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicFood, ownerFood } from '../utils/serialize.js';
import { listPublicFoods, categoryCounts, createFood, updateFood, removeFood } from '../services/foodService.js';

export const parseKeepImages = (raw) => {
  if (raw === undefined) return undefined;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : undefined;
  } catch {
    return undefined;
  }
};

export const list = asyncHandler(async (req, res) => {
  res.json(await listPublicFoods(req.validated.query));
});

export const categories = asyncHandler(async (_req, res) => {
  res.json({ categories: await categoryCounts() });
});

export const getOne = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).lean();
  if (!food) throw new AppError(404, 'This place could not be found.');
  const isOwner = req.user && food.createdBy && String(food.createdBy) === String(req.user._id);
  if (food.status !== 'approved' && !isOwner) throw new AppError(404, 'This place could not be found.');
  const loc =
    Number.isFinite(+req.query.lat) && Number.isFinite(+req.query.lng) && req.query.lat !== '' && req.query.lng !== ''
      ? { lat: +req.query.lat, lng: +req.query.lng }
      : null;
  const food_ = isOwner ? { ...ownerFood(food), distanceKm: publicFood(food, { loc }).distanceKm } : publicFood(food, { loc, detail: true });
  res.json({ food: food_ });
});

export const mine = asyncHandler(async (req, res) => {
  const foods = await Food.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ items: foods.map(ownerFood) });
});

export const create = asyncHandler(async (req, res) => {
  const pending = await Food.countDocuments({ createdBy: req.user._id, status: 'pending' });
  if (pending >= 10) throw new AppError(429, 'You already have 10 listings waiting for approval. Please wait for them to be reviewed.');
  const food = await createFood({ data: req.validated.body, files: req.files, createdBy: req.user._id, byAdmin: false });
  res.status(201).json({
    food: ownerFood(food),
    message: 'Your food submission has been received and is waiting for approval.',
  });
});

export const update = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id);
  if (!food || !food.createdBy || String(food.createdBy) !== String(req.user._id)) throw new AppError(404, 'This place could not be found.');
  await updateFood(food, req.validated.body, {
    files: req.files,
    keepImages: parseKeepImages(req.body.keepImages),
    resetToPending: true, // any change by the owner goes back to the admin for review
  });
  res.json({ food: ownerFood(food), message: 'Your changes were saved and are waiting for approval.' });
});

export const remove = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id);
  if (!food || !food.createdBy || String(food.createdBy) !== String(req.user._id)) throw new AppError(404, 'This place could not be found.');
  await removeFood(food);
  res.json({ message: 'Your listing was deleted.' });
});
