import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 600 },
    status: { type: String, enum: ['approved', 'pending'], default: 'approved' },
  },
  { timestamps: true }
);

reviewSchema.index({ food: 1, user: 1 }, { unique: true }); // one review per person per place
reviewSchema.index({ food: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
