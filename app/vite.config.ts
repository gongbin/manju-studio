import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Proxy API to the local Worker (`npm run dev:worker`, default :8787).
    // Without a worker running, the frontend falls back to its in-memory mock.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
