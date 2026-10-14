import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

let pending = null;

/** Connects once and reuses the connection (important on serverless hosts like Vercel). */
export function ensureDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!pending) {
    pending = mongoose
      .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .then(() => undefined)
      .catch((err) => {
        pending = null; // try again on the next request
        throw err;
      });
  }
  return pending;
}

/** For `npm run dev/start` and the scripts: connect, or explain what is wrong and stop. */
export async function connectDB() {
  try {
    await ensureDB();
    console.log('✅  MongoDB connected');
  } catch (err) {
    console.error('\n❌  Could not connect to MongoDB.');
    console.error('    Is MongoDB running? Check MONGODB_URI in your .env file.');
    console.error(`    (${err.message})\n`);
    process.exit(1);
  }
}
