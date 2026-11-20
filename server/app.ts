import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { DB } from './db.js';
import { digest, randomToken, hashPassword, verifyPassword } from './auth.js';

type User = { id: string; name: string; email: string; role: 'student' | 'staff' | 'admin' };
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: { token_hash: string; csrf: string; user_id: string | null };
    }
  }
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid = z.string().uuid();
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};
const staff = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === 'student') return next(new HttpError(403, 'Staff access required.'));
  next();
};
const userColumns = 'id, name, email, role';
export async function createApp(
  db: DB,
  options: { origin?: string; production?: boolean; demo?: boolean; loginLimit?: number } = {},
) {
  const origin = options.origin ?? 'http://localhost:3000';
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: options.production ? undefined : false,
      strictTransportSecurity: options.production ? undefined : false,
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const dummyHash = await hashPassword(randomToken());
  const audit = (tx: DB, actor: string, action: string, target: string | null, detail: string) =>
    tx.query('INSERT INTO audit_events(actor_id,action,target_id,detail) VALUES ($1,$2,$3,$4)', [
      actor,
      action,
      target,
      detail,
    ]);
  app.use('/api', async (req, _res, next) => {
    const cookie = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('campus_session='))
      ?.slice(15);
    if (cookie && /^[a-f0-9]{64}$/.test(cookie)) {
      req.session = (
        await db.query('SELECT * FROM sessions WHERE token_hash=$1 AND expires_at>NOW()', [
          digest(cookie),
        ])
      )[0];
      if (req.session?.user_id)
        req.user = (
          await db.query<User>(`SELECT ${userColumns} FROM users WHERE id=$1`, [
            req.session.user_id,
          ])
        )[0];
    }
    next();
  });
  async function issueSession(res: Response, userId: string | null) {
    const token = randomToken(),
      csrf = randomToken();
    await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
    await db.query(
      `INSERT INTO sessions(token_hash,csrf,user_id,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '8 hours')`,
      [digest(token), csrf, userId],
    );
    res.cookie('campus_session', token, {
      httpOnly: true,
      secure: !!options.production,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return csrf;
  }
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/session', async (req, res) => {
    const csrf = req.session?.csrf ?? (await issueSession(res, null));
    res.json({ user: req.user ?? null, csrf, demo: !!options.demo });
  });
  // Every write, including login/logout, requires the configured origin and a session-bound CSRF token.
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.headers.origin !== origin) return next(new HttpError(403, 'Untrusted request origin.'));
    const token = req.get('X-CSRF-Token') ?? '';
    if (
      !req.session ||
      Buffer.byteLength(token) !== Buffer.byteLength(req.session.csrf) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(req.session.csrf))
    )
      return next(new HttpError(403, 'Invalid security token. Refresh the page and try again.'));
    next();
  });
  app.post(
    '/api/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.loginLimit ?? 15,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }),
    }),
    async (req, res) => {
      const input = z
        .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
        .parse(req.body);
      const record = (
        await db.query('SELECT * FROM users WHERE email=$1', [input.email.toLowerCase()])
      )[0];
      const valid = await verifyPassword(input.password, record?.password_hash ?? dummyHash);
      if (!record || !valid) fail(401, 'Email or password is incorrect.');
      const { password_hash: _, ...user } = record;
      const csrf = await db.transaction(async (tx) => {
        await tx.query('DELETE FROM sessions WHERE token_hash=$1', [req.session!.token_hash]);
        await audit(tx, user.id, 'signed_in', user.id, 'Successful sign-in');
        // Session creation uses the same transaction to prevent partially completed sign-in.
        const token = randomToken(),
          csrf = randomToken();
        await tx.query(
          `INSERT INTO sessions(token_hash,csrf,user_id,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '8 hours')`,
          [digest(token), csrf, user.id],
        );
        res.cookie('campus_session', token, {
          httpOnly: true,
          secure: !!options.production,
          sameSite: 'strict',
          path: '/',
          maxAge: 28800000,
        });
        return csrf;
      });
      res.json({ user, csrf });
    },
  );
  app.use('/api', (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
    next();
  });
  app.post('/api/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.session!.token_hash]);
    res.clearCookie('campus_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/equipment', async (_req, res) =>
    res.json(await db.query('SELECT * FROM equipment ORDER BY category,name')),
  );
  app.post('/api/equipment', async (req, res) => {
    if (req.user!.role !== 'admin') fail(403, 'Administrator access required.');
    const item = z
      .object({
        name: z.string().trim().min(3).max(100),
        category: z.enum(['Laptops', 'Cameras', 'Audio', 'Accessories']),
        asset_tag: z
          .string()
          .trim()
          .regex(/^[A-Z0-9-]{3,30}$/),
        description: z.string().trim().min(5).max(300),
      })
      .parse(req.body);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        'INSERT INTO equipment(id,name,category,asset_tag,description) VALUES ($1,$2,$3,$4,$5)',
        [id, item.name, item.category, item.asset_tag, item.description],
      );
      await audit(tx, req.user!.id, 'equipment_created', id, `Added ${item.asset_tag}`);
    });
    res.status(201).json({ id });
  });
  app.patch('/api/equipment/:id', async (req, res) => {
    if (req.user!.role !== 'admin') fail(403, 'Administrator access required.');
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(['available', 'maintenance']) }).parse(req.body);
    await db.transaction(async (tx) => {
      const item = (await tx.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE', [id]))[0];
      if (!item) fail(404, 'Equipment not found.');
      if (!['available', 'maintenance'].includes(item.status))
        fail(409, 'Reserved or checked-out equipment cannot change availability.');
      await tx.query('UPDATE equipment SET status=$1 WHERE id=$2', [status, id]);
      await audit(tx, req.user!.id, 'availability_changed', id, status);
    });
    res.json({ ok: true });
  });
  const loanSelect = `SELECT l.*, l.due_date::text AS due_date, e.name AS equipment_name,e.asset_tag,e.category,u.name AS borrower,u.email AS borrower_email
    FROM loans l JOIN equipment e ON l.equipment_id=e.id JOIN users u ON l.user_id=u.id`;
  app.get('/api/loans', async (req, res) =>
    res.json(
      await db.query(
        `${loanSelect} ${req.user!.role === 'student' ? 'WHERE l.user_id=$1' : ''} ORDER BY l.created_at DESC`,
        req.user!.role === 'student' ? [req.user!.id] : [],
      ),
    ),
  );
  app.get('/api/loans/:id', async (req, res) => {
    const rows = await db.query(
      `${loanSelect} WHERE l.id=$1 ${req.user!.role === 'student' ? 'AND l.user_id=$2' : ''}`,
      req.user!.role === 'student'
        ? [uuid.parse(req.params.id), req.user!.id]
        : [uuid.parse(req.params.id)],
    );
    if (!rows[0]) fail(404, 'Request not found.');
    res.json(rows[0]);
  });
  app.post('/api/loans', async (req, res) => {
    const input = z
      .object({
        equipment_id: uuid,
        purpose: z.string().trim().min(10).max(500),
        due_date: z.iso.date(),
      })
      .parse(req.body);
    const today = new Date().toISOString().slice(0, 10);
    const max = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    if (input.due_date < today || input.due_date > max)
      fail(400, 'Choose a return date from today through the next 14 days.');
    const id = randomUUID();
    await db.transaction(async (tx) => {
      const item = (
        await tx.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE', [input.equipment_id])
      )[0];
      if (!item) fail(404, 'Equipment not found.');
      if (item.status !== 'available') fail(409, 'This item is no longer available.');
      const active = await tx.query(
        `SELECT id FROM loans WHERE equipment_id=$1 AND user_id=$2 AND status IN ('pending','approved','checked_out')`,
        [item.id, req.user!.id],
      );
      if (active.length) fail(409, 'You already have an active request for this item.');
      await tx.query(
        'INSERT INTO loans(id,equipment_id,user_id,purpose,due_date) VALUES ($1,$2,$3,$4,$5)',
        [id, item.id, req.user!.id, input.purpose, input.due_date],
      );
      await audit(tx, req.user!.id, 'requested', id, `Requested ${item.asset_tag}`);
    });
    res.status(201).json({ id });
  });
  app.post('/api/loans/:id/action', async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { action } = z
      .object({ action: z.enum(['approve', 'deny', 'checkout', 'return', 'cancel']) })
      .parse(req.body);
    await db.transaction(async (tx) => {
      const row = (
        await tx.query('SELECT *, due_date::text AS due_date FROM loans WHERE id=$1 FOR UPDATE', [
          id,
        ])
      )[0];
      if (!row || (req.user!.role === 'student' && row.user_id !== req.user!.id))
        fail(404, 'Request not found.');
      if (action !== 'cancel' && req.user!.role === 'student') fail(403, 'Staff access required.');
      if (action === 'approve' && row.user_id === req.user!.id)
        fail(403, 'A different staff member must approve your request.');
      const transitions: Record<string, [string[], string]> = {
        approve: [['pending'], 'approved'],
        deny: [['pending'], 'denied'],
        checkout: [['approved'], 'checked_out'],
        return: [['checked_out'], 'returned'],
        cancel: [['pending', 'approved'], 'cancelled'],
      };
      const [from, to] = transitions[action];
      if (!from.includes(row.status))
        fail(409, `Cannot ${action} a ${row.status.replaceAll('_', ' ')} request.`);
      const item = (
        await tx.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE', [row.equipment_id])
      )[0];
      if (action === 'approve') {
        if (String(row.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10))
          fail(409, 'Return date has passed. Submit a new request.');
        if (item.status !== 'available') fail(409, 'Equipment is already reserved or unavailable.');
        await tx.query(`UPDATE equipment SET status='reserved' WHERE id=$1`, [item.id]);
      } else if (action === 'checkout') {
        await tx.query(`UPDATE equipment SET status='checked_out' WHERE id=$1`, [item.id]);
      } else if (action === 'return' || (action === 'cancel' && row.status === 'approved')) {
        await tx.query(`UPDATE equipment SET status='available' WHERE id=$1`, [item.id]);
      }
      await tx.query('UPDATE loans SET status=$1,updated_at=NOW() WHERE id=$2', [to, id]);
      await audit(tx, req.user!.id, to, id, `${item.asset_tag}: ${row.status} to ${to}`);
    });
    res.json({ ok: true });
  });
  app.get('/api/audit', staff, async (_req, res) =>
    res.json(
      await db.query(
        `SELECT a.id,a.action,a.target_id,a.detail,a.created_at,u.name AS actor FROM audit_events a LEFT JOIN users u ON a.actor_id=u.id ORDER BY a.id DESC LIMIT 200`,
      ),
    ),
  );
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.code === '23505')
      return res
        .status(409)
        .json({
          error: 'This record already exists or this equipment already has an active loan.',
        });
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON body.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request body is too large.' });
    console.error('Request failed:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
