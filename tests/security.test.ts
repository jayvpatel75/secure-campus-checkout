import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDB, migrate, type DB } from '../server/db.js';
import { createApp } from '../server/app.js';
import { seedDemo, demoUsers, demoPassword } from '../server/seed.js';
import { hashPassword, verifyPassword } from '../server/auth.js';

let db: DB;
let app: Awaited<ReturnType<typeof createApp>>;
const origin = 'http://localhost:3000';
const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
before(async () => {
  db = await openDB(process.env.TEST_DATABASE_URL, 'memory://');
  await migrate(db);
  app = await createApp(db, { origin, demo: true });
});
beforeEach(async () => {
  await db.transaction(async (tx) => {
    for (const table of ['audit_events', 'sessions', 'loans', 'equipment', 'users'])
      await tx.query(`DELETE FROM ${table}`);
  });
  await seedDemo(db);
});
after(async () => {
  await db?.close();
});
async function client(role = 'student') {
  const agent = request.agent(app);
  const session = await agent.get('/api/session').expect(200);
  const login = await agent
    .post('/api/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', session.body.csrf)
    .send({ email: `${role}@campus.example`, password: demoPassword })
    .expect(200);
  const post = (path: string, body: object) =>
    agent.post(`/api${path}`).set('Origin', origin).set('X-CSRF-Token', login.body.csrf).send(body);
  const patch = (path: string, body: object) =>
    agent
      .patch(`/api${path}`)
      .set('Origin', origin)
      .set('X-CSRF-Token', login.body.csrf)
      .send(body);
  return { agent, post, patch, csrf: login.body.csrf };
}
async function item() {
  return (await db.query(`SELECT * FROM equipment WHERE asset_tag='CAM-001'`))[0];
}
async function loan(c: Awaited<ReturnType<typeof client>>) {
  return (
    await c
      .post('/loans', {
        equipment_id: (await item()).id,
        purpose: 'Record a campus documentary for class.',
        due_date: due,
      })
      .expect(201)
  ).body.id;
}

test('unauthenticated callers cannot read equipment, loans, or the audit log', async () => {
  for (const path of ['/equipment', '/loans', '/audit'])
    await request(app).get(`/api${path}`).expect(401);
});
test('session cookie is HttpOnly and SameSite=Strict; auth rotates session and CSRF', async () => {
  const agent = request.agent(app);
  const initial = await agent.get('/api/session');
  assert.match(initial.headers['set-cookie'][0], /HttpOnly/);
  assert.match(initial.headers['set-cookie'][0], /SameSite=Strict/);
  const result = await agent
    .post('/api/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', initial.body.csrf)
    .send({ email: demoUsers[0].email, password: demoPassword })
    .expect(200);
  assert.notEqual(result.body.csrf, initial.body.csrf);
  assert.notEqual(result.headers['set-cookie'][0], initial.headers['set-cookie'][0]);
  assert.equal(result.body.user.password_hash, undefined);
  await agent
    .post('/api/logout')
    .set('Origin', origin)
    .set('X-CSRF-Token', initial.body.csrf)
    .send({})
    .expect(403);
});
test('missing CSRF token and untrusted origin block writes', async () => {
  const c = await client();
  await c.agent.post('/api/loans').set('Origin', origin).send({}).expect(403);
  await c.agent
    .post('/api/logout')
    .set('Origin', 'https://evil.example')
    .set('X-CSRF-Token', c.csrf)
    .send({})
    .expect(403);
});
test('invalid credentials return a generic error and login is rate limited', async () => {
  const limited = await createApp(db, { origin, loginLimit: 2 });
  const agent = request.agent(limited);
  const s = await agent.get('/api/session');
  for (let i = 0; i < 2; i++)
    await agent
      .post('/api/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', s.body.csrf)
      .send({ email: 'missing@campus.example', password: 'incorrect' })
      .expect(401);
  await agent
    .post('/api/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', s.body.csrf)
    .send({ email: 'missing@campus.example', password: 'incorrect' })
    .expect(429);
});
test('passwords use salted hashes and correct verification', async () => {
  const a = await hashPassword('very-long-test-password'),
    b = await hashPassword('very-long-test-password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('very-long-test-password', a), true);
  assert.equal(await verifyPassword('wrong', a), false);
  const user = (await db.query('SELECT password_hash FROM users LIMIT 1'))[0];
  assert.notEqual(user.password_hash, demoPassword);
});
test('students only see their own loans and receive 404 for another borrower ID', async () => {
  const a = await client(),
    b = await client('student2');
  const id = await loan(a);
  assert.equal((await b.agent.get('/api/loans').expect(200)).body.length, 0);
  await b.agent.get(`/api/loans/${id}`).expect(404);
  await b.post(`/loans/${id}/action`, { action: 'cancel' }).expect(404);
});
test('student cannot approve, checkout, return, read audit, or add inventory', async () => {
  const c = await client();
  const id = await loan(c);
  for (const action of ['approve', 'checkout', 'return'])
    await c.post(`/loans/${id}/action`, { action }).expect(403);
  await c.agent.get('/api/audit').expect(403);
  await c.post('/equipment', {}).expect(403);
});
test('staff can approve, record pickup and return; audit and stock stay consistent', async () => {
  const student = await client(),
    staff = await client('staff'),
    id = await loan(student);
  for (const [action, status] of [
    ['approve', 'reserved'],
    ['checkout', 'checked_out'],
    ['return', 'available'],
  ]) {
    await staff.post(`/loans/${id}/action`, { action }).expect(200);
    assert.equal((await item()).status, status);
  }
  const events = await staff.agent.get('/api/audit').expect(200);
  for (const action of ['requested', 'approved', 'checked_out', 'returned'])
    assert.ok(events.body.some((e: any) => e.action === action && e.target_id === id));
});
test('concurrent approval requests cannot double-book a physical asset', async () => {
  const a = await client(),
    b = await client('student2'),
    staff = await client('staff');
  const one = await loan(a),
    two = await loan(b);
  const results = await Promise.all([
    staff.post(`/loans/${one}/action`, { action: 'approve' }),
    staff.post(`/loans/${two}/action`, { action: 'approve' }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (
      await db.query(`SELECT id FROM loans WHERE equipment_id=$1 AND status='approved'`, [
        (await item()).id,
      ])
    ).length,
    1,
  );
  const loser = results[0].status === 409 ? one : two;
  assert.equal(
    (await db.query('SELECT status FROM loans WHERE id=$1', [loser]))[0].status,
    'pending',
  );
  assert.equal(
    (await db.query(`SELECT * FROM audit_events WHERE target_id=$1 AND action='approved'`, [loser]))
      .length,
    0,
  );
});
test('invalid state transitions are rejected without changing inventory', async () => {
  const c = await client(),
    s = await client('staff'),
    id = await loan(c);
  await s.post(`/loans/${id}/action`, { action: 'return' }).expect(409);
  assert.equal((await item()).status, 'available');
  await s.post(`/loans/${id}/action`, { action: 'deny' }).expect(200);
  await s.post(`/loans/${id}/action`, { action: 'approve' }).expect(409);
});
test('cancelling an approved request releases the reservation', async () => {
  const c = await client(),
    s = await client('staff'),
    id = await loan(c);
  await s.post(`/loans/${id}/action`, { action: 'approve' }).expect(200);
  await c.post(`/loans/${id}/action`, { action: 'cancel' }).expect(200);
  assert.equal((await item()).status, 'available');
});
test('staff cannot approve their own request', async () => {
  const c = await client('staff'),
    id = await loan(c);
  await c.post(`/loans/${id}/action`, { action: 'approve' }).expect(403);
});
test('duplicate requests, unavailable items and invalid dates are rejected', async () => {
  const c = await client();
  await loan(c);
  await c
    .post('/loans', {
      equipment_id: (await item()).id,
      purpose: 'Another documentary request.',
      due_date: due,
    })
    .expect(409);
  const unavailable = (await db.query(`SELECT id FROM equipment WHERE status='maintenance'`))[0];
  await c
    .post('/loans', {
      equipment_id: unavailable.id,
      purpose: 'Record an interview for class.',
      due_date: due,
    })
    .expect(409);
  for (const due_date of ['2000-01-01', '2099-01-01', '2026-02-31'])
    await c
      .post('/loans', {
        equipment_id: (await item()).id,
        purpose: 'Record an interview for class.',
        due_date,
      })
      .expect(400);
});
test('administrator can add equipment and toggle maintenance; staff cannot', async () => {
  const a = await client('admin'),
    s = await client('staff');
  const payload = {
    name: 'Test Laptop',
    category: 'Laptops',
    asset_tag: 'TEST-001',
    description: 'A fictional test laptop.',
  };
  await s.post('/equipment', payload).expect(403);
  const added = await a.post('/equipment', payload).expect(201);
  await a.patch(`/equipment/${added.body.id}`, { status: 'maintenance' }).expect(200);
  await a.patch(`/equipment/${added.body.id}`, { status: 'available' }).expect(200);
  await a.post('/equipment', payload).expect(409);
  const busy = (await db.query(`SELECT id FROM equipment WHERE status='checked_out'`))[0];
  await a.patch(`/equipment/${busy.id}`, { status: 'maintenance' }).expect(409);
});
test('validation rejects malformed IDs and oversized input; SQL strings remain data', async () => {
  const c = await client();
  await c.agent.get('/api/loans/not-a-uuid').expect(400);
  await c
    .post('/loans', { equipment_id: (await item()).id, purpose: 'x'.repeat(501), due_date: due })
    .expect(400);
  const purpose = "Project study'; DROP TABLE equipment; --";
  await c.post('/loans', { equipment_id: (await item()).id, purpose, due_date: due }).expect(201);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM equipment'))[0].n, 8);
});
test('expired sessions and logged-out sessions cannot access protected data', async () => {
  const c = await client();
  await c.post('/logout', {}).expect(200);
  await c.agent.get('/api/loans').expect(401);
  const d = await client();
  await db.query(`UPDATE sessions SET expires_at=NOW()-INTERVAL '1 minute'`);
  await d.agent.get('/api/loans').expect(401);
});
test('production response enables CSP and Secure cookies; API is never cacheable', async () => {
  const secure = await createApp(db, { production: true, origin: 'https://campus.example' });
  const result = await request(secure).get('/api/session').expect(200);
  assert.match(result.headers['set-cookie'][0], /Secure/);
  assert.ok(result.headers['content-security-policy']);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.headers['x-powered-by'], undefined);
});
