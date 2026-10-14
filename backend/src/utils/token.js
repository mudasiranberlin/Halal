import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const USER_COOKIE = 'ff_token';
export const ADMIN_COOKIE = 'ff_admin';

const LIFETIME = { user: 7 * 24 * 3600, admin: 8 * 3600 }; // seconds

export function signToken(user, audience) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    audience,
    expiresIn: LIFETIME[audience],
  });
}

export function verifyToken(token, audience) {
  return jwt.verify(token, env.jwtSecret, { audience });
}

export function cookieOptions(audience) {
  return {
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    maxAge: LIFETIME[audience] * 1000,
    path: '/',
  };
}

export function setAuthCookie(res, user, audience) {
  res.cookie(audience === 'admin' ? ADMIN_COOKIE : USER_COOKIE, signToken(user, audience), cookieOptions(audience));
}

export function clearAuthCookie(res, audience) {
  const { maxAge, ...opts } = cookieOptions(audience);
  res.clearCookie(audience === 'admin' ? ADMIN_COOKIE : USER_COOKIE, opts);
}
