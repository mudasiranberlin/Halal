import { User, DUMMY_HASH } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { accountUser } from '../utils/serialize.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.validated.body;
  if (await User.exists({ email })) {
    throw new AppError(409, 'An account with this email already exists. Try logging in instead.', { email: 'This email is already registered' });
  }
  const user = await User.create({ name, email, password, phone, role: 'user' });
  setAuthCookie(res, user, 'user');
  res.status(201).json({ user: accountUser(user), message: 'Welcome to Food Finder Cambodia!' });
});

/** Shared by user and admin login so both behave the same way. */
export async function checkCredentials(email, password, wantedRole) {
  const user = await User.findOne({ email }).select('+password');
  // Always run bcrypt so response time does not reveal whether the email exists.
  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !ok || user.role !== wantedRole) throw new AppError(401, 'Incorrect email or password.');
  if (user.status !== 'active') throw new AppError(403, 'This account has been disabled. Please contact support.');
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await checkCredentials(email, password, 'user');
  setAuthCookie(res, user, 'user');
  res.json({ user: accountUser(user) });
});

export const logout = (_req, res) => {
  clearAuthCookie(res, 'user');
  res.json({ message: 'You have been logged out.' });
};

export const me = (req, res) => res.json({ user: accountUser(req.user) });
