import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { mkdir } from 'node:fs/promises';

export interface DB {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function openDB(url?: string, path = '.data/campus'): Promise<DB> {
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    const wrap = (client: pg.Pool | pg.PoolClient): DB => ({
      query: async (sql, params) => (await client.query(sql, params)).rows,
      transaction: async (fn) => {
        const connection = await pool.connect();
        try {
          await connection.query('BEGIN');
          const result = await fn(wrap(connection));
          await connection.query('COMMIT');
          return result;
        } catch (error) {
          await connection.query('ROLLBACK');
          throw error;
        } finally {
          connection.release();
        }
      },
      close: () => pool.end(),
    });
    return wrap(pool);
  }
  if (path !== 'memory://') await mkdir(path, { recursive: true });
  const embedded = new PGlite(path);
  // PGlite owns one connection: serialize complete transactions AND other queries.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>) => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };
  const raw = (connection: any): DB => ({
    query: async (sql, params) => (await connection.query(sql, params)).rows,
    transaction: async (fn) => fn(raw(connection)),
    close: async () => {},
  });
  return {
    query: (sql, params) => serial(() => raw(embedded).query(sql, params)),
    transaction: (fn) => serial(() => embedded.transaction((tx) => fn(raw(tx)))),
    close: () => serial(() => embedded.close()),
  };
}

export async function migrate(db: DB) {
  await db.transaction(async (tx) => {
    await tx.query(`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','staff','admin'))
    )`);
    await tx.query(`CREATE TABLE IF NOT EXISTS equipment (
      id UUID PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      asset_tag TEXT UNIQUE NOT NULL, description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','checked_out','maintenance'))
    )`);
    await tx.query(`CREATE TABLE IF NOT EXISTS loans (
      id UUID PRIMARY KEY, equipment_id UUID NOT NULL REFERENCES equipment(id),
      user_id UUID NOT NULL REFERENCES users(id), purpose TEXT NOT NULL,
      due_date DATE NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','approved','checked_out','returned','denied','cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await tx.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS one_active_loan_per_asset ON loans(equipment_id) WHERE status IN ('approved','checked_out')`,
    );
    await tx.query(`CREATE INDEX IF NOT EXISTS loans_user_idx ON loans(user_id)`);
    await tx.query(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, user_id UUID REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL
    )`);
    await tx.query(`CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id), action TEXT NOT NULL,
      target_id UUID, detail TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  });
}
