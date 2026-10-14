import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 200 },
    image: { type: String, required: true }, // "/uploads/promotions/xxx.webp"
    link: { type: String, trim: true, default: '/' }, // internal path like "/category/seafood"
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

promotionSchema.index({ status: 1, order: 1 });

export const Promotion = mongoose.model('Promotion', promotionSchema);
