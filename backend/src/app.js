import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { UPLOAD_ROOT } from './services/imageService.js';
import { apiLimiter, originCheck } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp({ ensureDb } = {}) {
  const app = express();
  if (env.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Images are loaded from the website on another address, so allow cross-origin image use.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  if (!env.isProd) app.use(morgan('dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      maxAge: '7d',
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  if (ensureDb) app.use((_req, _res, next) => ensureDb().then(() => next(), next));

  app.use('/api', apiLimiter, originCheck, routes);
  // Some hosts hand the app the path WITHOUT the "/api" prefix, so accept both forms there.
  if (process.env.VERCEL) app.use('/', apiLimiter, originCheck, routes);
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
