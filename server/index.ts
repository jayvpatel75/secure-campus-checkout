import 'dotenv/config';
import express from 'express';
import { resolve } from 'node:path';
import { openDB, migrate } from './db.js';
import { createApp } from './app.js';
const production = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const demo = process.env.DEMO_MODE === 'true';
const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
if (production && (demo || !origin.startsWith('https://') || !process.env.DATABASE_URL))
  throw new Error('Production requires DEMO_MODE=false, HTTPS APP_ORIGIN and DATABASE_URL.');
const db = await openDB(process.env.DATABASE_URL);
await migrate(db);
if (production) {
  const known = await db.query(`SELECT email FROM users WHERE email LIKE '%@campus.example'`);
  if (known.length)
    throw new Error('Demo users are present. Use a separate, clean production database.');
}
const app = await createApp(db, { production, origin, demo });
if (production) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
const server = app.listen(port, host, () =>
  console.log(`CampusKit ready: ${origin}${demo ? ' (local demo accounts enabled)' : ''}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
