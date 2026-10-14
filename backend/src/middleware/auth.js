import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { USER_COOKIE, ADMIN_COOKIE, verifyToken, clearAuthCookie } from '../utils/token.js';

async function loadUser(req, cookieName, audience) {
  const token = req.cookies?.[cookieName];
  if (!token) return null;
  try {
    const payload = verifyToken(token, audience);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') return null;
    if (audience === 'admin' && user.role !== 'admin') return null;
    if (audience === 'user' && user.role === 'admin') return null;
    return user;
  } catch {
    return null;
  }
}

/** Visitor must be logged in as a normal user. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await loadUser(req, USER_COOKIE, 'user');
  if (!user) {
    if (req.cookies?.[USER_COOKIE]) clearAuthCookie(res, 'user');
    throw new AppError(401, 'Please log in to continue.');
  }
  req.user = user;
  next();
});

/** Adds req.user when logged in, but never blocks. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = await loadUser(req, USER_COOKIE, 'user');
  next();
});

/** Only administrators (separate admin cookie + role check against the database). */
export const requireAdmin = asyncHandler(async (req, res, next) => {
  const admin = await loadUser(req, ADMIN_COOKIE, 'admin');
  if (!admin) {
    if (req.cookies?.[ADMIN_COOKIE]) clearAuthCookie(res, 'admin');
    throw new AppError(401, 'Administrator login required.');
  }
  req.admin = admin;
  next();
});

export const validateId = (param = 'id') => (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) return next(new AppError(404, 'Not found.'));
  next();
};
