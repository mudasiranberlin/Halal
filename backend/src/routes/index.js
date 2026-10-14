import { Router } from 'express';
import { validate, } from '../middleware/validate.js';
import { requireAuth, optionalAuth, requireAdmin, validateId } from '../middleware/auth.js';
import { authLimiter, adminLoginLimiter } from '../middleware/security.js';
import { foodImages, promoImage } from '../middleware/upload.js';
import { registerSchema, loginSchema, foodSchema, foodUpdateSchema, reviewSchema, listQuerySchema, promotionSchema, promotionUpdateSchema } from '../utils/schemas.js';
import * as auth from '../controllers/authController.js';
import * as foods from '../controllers/foodController.js';
import * as reviews from '../controllers/reviewController.js';
import * as promos from '../controllers/promotionController.js';
import * as admin from '../controllers/adminController.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true }));

/* ------------------------------ auth ------------------------------ */
api.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
api.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', requireAuth, auth.me);

/* ------------------------------ public ----------------------------- */
api.get('/categories', foods.categories);
api.get('/promotions', promos.listActive);
api.get('/foods', validate(listQuerySchema, 'query'), foods.list);
api.get('/foods/mine', requireAuth, foods.mine); // must come before /foods/:id
api.get('/foods/:id', validateId(), optionalAuth, foods.getOne);
api.post('/foods', requireAuth, foodImages, validate(foodSchema), foods.create);
api.put('/foods/:id', validateId(), requireAuth, foodImages, validate(foodUpdateSchema), foods.update);
api.delete('/foods/:id', validateId(), requireAuth, foods.remove);

api.get('/foods/:id/reviews', validateId(), reviews.listForFood);
api.post('/foods/:id/reviews', validateId(), requireAuth, validate(reviewSchema), reviews.create);
api.delete('/reviews/:id', validateId(), requireAuth, reviews.removeOwn);

/* ------------------------------ admin ------------------------------ */
api.post('/admin/login', adminLoginLimiter, validate(loginSchema), admin.login);
api.post('/admin/logout', admin.logout);

const adminApi = Router();
adminApi.use(requireAdmin);
adminApi.get('/me', admin.me);
adminApi.get('/dashboard', admin.dashboard);

adminApi.get('/foods', admin.listFoods);
adminApi.post('/foods', foodImages, validate(foodSchema), admin.createFoodAdmin);
adminApi.get('/foods/:id', validateId(), admin.getFood);
adminApi.put('/foods/:id/approve', validateId(), admin.approveFood);
adminApi.put('/foods/:id/reject', validateId(), admin.rejectFood);
adminApi.put('/foods/:id', validateId(), foodImages, validate(foodUpdateSchema), admin.updateFoodAdmin);
adminApi.delete('/foods/:id', validateId(), admin.deleteFood);

adminApi.get('/reviews', admin.listReviews);
adminApi.put('/reviews/:id/approve', validateId(), admin.approveReview);
adminApi.delete('/reviews/:id', validateId(), admin.deleteReview);

adminApi.get('/users', admin.listUsers);
adminApi.get('/users/:id', validateId(), admin.getUser);
adminApi.put('/users/:id/status', validateId(), admin.setUserStatus);
adminApi.delete('/users/:id', validateId(), admin.deleteUser);

adminApi.get('/promotions', admin.listPromotions);
adminApi.post('/promotions', promoImage, validate(promotionSchema), admin.createPromotion);
adminApi.put('/promotions/reorder', admin.reorderPromotions); // before /:id
adminApi.put('/promotions/:id', validateId(), promoImage, validate(promotionUpdateSchema), admin.updatePromotion);
adminApi.delete('/promotions/:id', validateId(), admin.deletePromotion);

api.use('/admin', adminApi);

export default api;
