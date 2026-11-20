import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { openDB, migrate } from './db.js';
import { hashPassword } from './auth.js';
import { z } from 'zod';
// Supply password via environment, never a command argument; remove it after use.
const email = z.email().parse(process.env.NEW_USER_EMAIL).toLowerCase();
const name = z.string().trim().min(2).max(100).parse(process.env.NEW_USER_NAME);
const role = z.enum(['student', 'staff', 'admin']).parse(process.env.NEW_USER_ROLE ?? 'student');
const password = z.string().min(14).max(256).parse(process.env.NEW_USER_PASSWORD);
if (process.env.NODE_ENV === 'production' && email.endsWith('@campus.example'))
  throw new Error('Demo addresses are not allowed in production.');
const db = await openDB(process.env.DATABASE_URL);
try {
  await migrate(db);
  await db.query('INSERT INTO users(id,name,email,role,password_hash) VALUES ($1,$2,$3,$4,$5)', [
    randomUUID(),
    name,
    email,
    role,
    await hashPassword(password),
  ]);
  console.log('User created.');
} finally {
  await db.close();
}
