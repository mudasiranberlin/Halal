import { z } from 'zod';
import { CATEGORY_SLUGS, PROVINCES, FEATURES } from '../config/categories.js';

const phoneRe = /^\+?[0-9][0-9\s-]{5,19}$/;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time');

// Multipart forms send everything as text, so JSON-ish fields arrive as strings.
const json = (schema) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return '__invalid__';
    }
  }, schema);

const num = (label, min, max) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` }).min(min, `${label} must be between ${min} and ${max}`).max(max, `${label} must be between ${min} and ${max}`)
  );

const hoursSchema = z
  .array(
    z.object({
      day: z.number().int().min(0).max(6),
      isClosed: z.boolean().default(false),
      open: hhmm.optional(),
      close: hhmm.optional(),
    })
  )
  .length(7, 'Please provide hours for all 7 days')
  .superRefine((arr, ctx) => {
    const days = new Set(arr.map((h) => h.day));
    if (days.size !== 7) ctx.addIssue({ code: 'custom', message: 'Each day of the week must appear once' });
    arr.forEach((h) => {
      if (!h.isClosed && (!h.open || !h.close)) ctx.addIssue({ code: 'custom', message: 'Open days need opening and closing times' });
    });
  });

export const foodSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name is too short').max(100, 'Name is too long'),
  category: z.enum(CATEGORY_SLUGS, { errorMap: () => ({ message: 'Choose a category' }) }),
  description: z.string({ required_error: 'Description is required' }).trim().min(10, 'Please write at least 10 characters').max(1000, 'Description is too long (max 1000)'),
  address: z.string({ required_error: 'Address is required' }).trim().min(5, 'Please enter the address').max(200),
  city: z.enum(PROVINCES, { errorMap: () => ({ message: 'Choose a city or province' }) }),
  phone: z.string().trim().regex(phoneRe, 'Enter a valid phone number').or(z.literal('')).default(''),
  telegram: z
    .string()
    .trim()
    .regex(/^(@?[A-Za-z0-9_]{3,32}|\+?[0-9][0-9\s-]{5,19})$/, 'Use @username or a phone number')
    .or(z.literal(''))
    .default(''),
  latitude: num('Latitude', -90, 90),
  longitude: num('Longitude', -180, 180),
  businessHours: json(hoursSchema),
  priceRange: z.enum(['', '$', '$$', '$$$']).default(''),
  features: json(z.array(z.enum(FEATURES)).max(10)).default([]),
});

export const foodUpdateSchema = foodSchema.partial();

export const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name is too short').max(80),
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long (max 72)')
    .regex(/[A-Za-z]/, 'Password needs at least one letter')
    .regex(/[0-9]/, 'Password needs at least one number'),
  phone: z.string().trim().regex(phoneRe, 'Enter a valid phone number').or(z.literal('')).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const reviewSchema = z.object({
  rating: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ required_error: 'Please choose a star rating', invalid_type_error: 'Please choose a star rating' }).int().min(1, 'Rating must be 1 to 5').max(5, 'Rating must be 1 to 5')
  ),
  comment: z.string({ required_error: 'Please write a short review' }).trim().min(3, 'Please write a short review').max(600, 'Review is too long (max 600)'),
});

const link = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\//.test(v), 'Use a page like /category/seafood or an https:// link')
  .default('/');

export const promotionSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(2, 'Title is too short').max(80),
  description: z.string().trim().max(200).default(''),
  link,
  status: z.enum(['active', 'inactive']).default('active'),
});

export const promotionUpdateSchema = promotionSchema.partial();

export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORY_SLUGS).optional(),
  city: z.enum(PROVINCES).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openNow: z.enum(['true', 'false']).optional(),
  verified: z.enum(['true', 'false']).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(500).optional(),
  sort: z.enum(['popular', 'distance', 'rating', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
