import mongoose from 'mongoose';
import { CATEGORY_SLUGS, PROVINCES, FEATURES } from '../config/categories.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const hoursSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    isClosed: { type: Boolean, default: false },
    open: { type: String, match: TIME, default: '08:00' },
    close: { type: String, match: TIME, default: '20:00' },
  },
  { _id: false }
);

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, enum: CATEGORY_SLUGS },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    images: { type: [String], default: [] }, // stored as "/uploads/foods/xxx.webp"
    address: { type: String, trim: true, default: '', maxlength: 200 },
    city: { type: String, required: true, enum: PROVINCES },
    phone: { type: String, trim: true, default: '', maxlength: 30 },
    telegram: { type: String, trim: true, default: '', maxlength: 64 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    businessHours: { type: [hoursSchema], default: [] },
    priceRange: { type: String, enum: ['', '$', '$$', '$$$'], default: '' },
    features: { type: [{ type: String, enum: FEATURES }], default: [] },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '', maxlength: 300 },
    isDemo: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Kept in sync with approved reviews (see reviewService.recalculateRating)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

foodSchema.index({ status: 1, category: 1 });
foodSchema.index({ status: 1, isDemo: 1 });
foodSchema.index({ status: 1, city: 1 });
foodSchema.index({ status: 1, ratingAvg: -1, ratingCount: -1 });
foodSchema.index({ createdBy: 1, createdAt: -1 });
foodSchema.index({ name: 1 });

export const Food = mongoose.model('Food', foodSchema);
