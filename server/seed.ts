import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { openDB, migrate, type DB } from './db.js';
import { hashPassword } from './auth.js';

export const demoUsers = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Alex Morgan',
    email: 'student@campus.example',
    role: 'student',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Jordan Lee',
    email: 'staff@campus.example',
    role: 'staff',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Sam Rivera',
    email: 'admin@campus.example',
    role: 'admin',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Taylor Chen',
    email: 'student2@campus.example',
    role: 'student',
  },
];
export const demoPassword = 'CampusDemo!2026';
export async function seedDemo(db: DB) {
  const hash = await hashPassword(demoPassword);
  await db.transaction(async (tx) => {
    for (const user of demoUsers)
      await tx.query(
        'INSERT INTO users(id,name,email,role,password_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [user.id, user.name, user.email, user.role, hash],
      );
    const items = [
      ['MacBook Air 13-inch', 'Laptops', 'LAP-001', 'Apple M3 · 16 GB RAM · charger included'],
      ['ThinkPad T14', 'Laptops', 'LAP-002', 'Intel Core i7 · 16 GB RAM · Windows 11'],
      ['Sony Alpha a6400', 'Cameras', 'CAM-001', '24.2 MP mirrorless · 16–50 mm lens · carry case'],
      ['Canon EOS R50', 'Cameras', 'CAM-002', '24.2 MP mirrorless · 18–45 mm lens · SD card'],
      ['Zoom H5 Recorder', 'Audio', 'AUD-001', 'Portable audio recorder · XY microphone · case'],
      ['RØDE Wireless GO II', 'Audio', 'AUD-002', 'Dual wireless microphone · USB-C cable · pouch'],
      [
        'USB-C Presentation Kit',
        'Accessories',
        'ACC-001',
        'HDMI adapter · wireless presenter · carry pouch',
      ],
      [
        'Manfrotto Compact Tripod',
        'Accessories',
        'ACC-002',
        'Lightweight aluminum · quick-release plate',
      ],
    ];
    for (const [name, category, tag, description] of items)
      await tx.query(
        'INSERT INTO equipment(id,name,category,asset_tag,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [randomUUID(), name, category, tag, description],
      );
    const existing = await tx.query('SELECT id FROM loans LIMIT 1');
    if (!existing.length) {
      const item = (await tx.query(`SELECT id FROM equipment WHERE asset_tag='LAP-002'`))[0];
      const id = randomUUID();
      await tx.query(
        `INSERT INTO loans(id,equipment_id,user_id,purpose,due_date,status) VALUES ($1,$2,$3,$4,CURRENT_DATE+5,'checked_out')`,
        [id, item.id, demoUsers[0].id, 'Complete my digital learning research assignment.'],
      );
      await tx.query(`UPDATE equipment SET status='checked_out' WHERE id=$1`, [item.id]);
      await tx.query(
        `INSERT INTO audit_events(actor_id,action,target_id,detail) VALUES ($1,'checked_out',$2,'LAP-002: fictional demonstration loan')`,
        [demoUsers[1].id, id],
      );
      await tx.query(`UPDATE equipment SET status='maintenance' WHERE asset_tag='AUD-002'`);
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true')
    throw new Error('Demo seeding requires DEMO_MODE=true and a non-production environment.');
  const db = await openDB(process.env.DATABASE_URL);
  try {
    await migrate(db);
    await seedDemo(db);
    console.log(
      'Fictional demo data ready. Accounts: student@campus.example, staff@campus.example, admin@campus.example. Password: CampusDemo!2026',
    );
  } finally {
    await db.close();
  }
}
