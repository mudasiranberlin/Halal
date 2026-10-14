import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the website runs on :5173 and forwards /api calls to the
// backend on :5000. Because the browser only talks to :5173, login cookies work
// without any extra CORS setup.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
  preview: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
});
