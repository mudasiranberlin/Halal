import { env } from './config/env.js';
import { connectDB, ensureDB } from './config/db.js';
import { createApp } from './app.js';

const app = createApp({ ensureDb: ensureDB });

// On Vercel the platform calls the exported app for each request.
// Everywhere else (your computer, a normal server) we open a port ourselves.
if (!process.env.VERCEL) {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`🍜  Food Finder Cambodia API running at http://localhost:${env.port}`);
  });
}

export default app;
