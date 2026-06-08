import { defineConfig } from 'drizzle-kit';

// Schema → SQL migrations for Cloudflare D1 (SQLite).
// `npm run db:generate` writes to ./migrations; apply with `npm run db:migrate`.
export default defineConfig({
  dialect: 'sqlite',
  schema: './worker/db/schema.ts',
  out: './migrations',
});
