import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'That page or resource does not exist.'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let errors;

  if (err instanceof AppError) {
    ({ status, message, errors } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Please check the highlighted fields.';
  } else if (err?.name === 'MulterError') {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'One of the images is too large. Each image must be 3 MB or smaller.';
    else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') message = 'You can upload up to 3 images.';
    else message = 'The upload could not be processed.';
    errors = { images: message };
  } else if (err?.code === 'BAD_FILE_TYPE') {
    status = 400;
    message = err.message;
    errors = { images: message };
  } else if (err?.name === 'ValidationError') {
    status = 400;
    message = 'Please check the information you entered.';
  } else if (err?.name === 'CastError') {
    status = 404;
    message = 'Not found.';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'That already exists.';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid request.';
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  else if (!env.isProd && !(err instanceof AppError)) console.warn(`[${req.method} ${req.originalUrl}] ${err.name}: ${err.message}`);

  res.status(status).json({ message, ...(errors ? { errors } : {}) });
}
