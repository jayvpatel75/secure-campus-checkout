# CampusKit — Secure Campus Equipment Checkout

An accessible full-stack application for lending campus laptops, cameras, audio gear, and accessories. Students request equipment; staff approve, record pickup, and record return. Server-side authorization keeps borrower records private, and a transactional audit trail records changes.

[![Build and security checks](https://github.com/jayvpatel75/secure-campus-checkout/actions/workflows/ci.yml/badge.svg)](https://github.com/jayvpatel75/secure-campus-checkout/actions/workflows/ci.yml)

![CampusKit equipment catalog](docs/screenshots/catalog.png)

## Why this project

Equipment lending has a simple business workflow and meaningful security problems: protecting student requests, controlling staff actions, preventing double bookings, and keeping an accountable history. This project connects those problems to concrete, testable controls.

Built as a portfolio demonstration by Jay Patel with AI-assisted implementation. All demo users and loan records are fictional. This is an independent project, not an official university service.

## Features

- Responsive catalog with category filters, search, and availability filtering.
- Student, staff, and administrator roles enforced on the backend.
- Requests, approvals, reservations, pickup, return, denial, and cancellation.
- Fourteen-day borrowing window; overdue indicators; inventory maintenance mode.
- Private student request lists and ownership checks on individual requests.
- Transactional stock updates, row locks, and a unique index against double booking.
- Opaque server-side sessions, salted password hashes, CSRF and origin checks.
- Staff audit log; administrator inventory creation and maintenance controls.
- Keyboard navigation, labeled forms, focus-managed native dialogs, and error feedback.
- Bundled fonts and original SVG equipment illustrations; no third-party runtime requests.

## Stack

| Layer        | Technology                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Interface    | React, TypeScript, Vite, CSS, Lucide icons                             |
| API          | Node.js 24+, Express, Zod                                              |
| Database     | PostgreSQL; embedded PostgreSQL through PGlite for local use           |
| Security     | Node.js scrypt, hashed session identifiers, Helmet, express-rate-limit |
| Verification | Node test runner, Supertest, Playwright, axe-core, GitHub Actions      |

## Run locally

Install **Node.js 24 or later**. Docker and cloud accounts are optional.

```powershell
git clone https://github.com/jayvpatel75/secure-campus-checkout.git
cd secure-campus-checkout
npm ci
Copy-Item .env.example .env
npm run seed:demo
npm run dev
```

On macOS/Linux, replace `Copy-Item .env.example .env` with `cp .env.example .env`.

On Windows, you can also run `./Start-CampusKit.ps1` for local setup and startup. It can locate the installed Node runtime when an inactive nvm shim is first on PATH.

Open **http://localhost:3000**. Use that hostname, which matches the configured CSRF origin. Local data persists in the ignored `.data/` directory. The development server listens only on loopback by default.

### Fictional local demo accounts

Select a role on the login screen to populate its credentials, then click **Sign in**.

| Role                              | Email                   | Password        |
| --------------------------------- | ----------------------- | --------------- |
| Student                           | student@campus.example  | CampusDemo!2026 |
| Staff                             | staff@campus.example    | CampusDemo!2026 |
| Administrator                     | admin@campus.example    | CampusDemo!2026 |
| Second student for privacy checks | student2@campus.example | CampusDemo!2026 |

These are intentionally public, local demonstration credentials. Demo seeding requires `DEMO_MODE=true` and refuses production mode. Production startup rejects demo accounts, demo mode, missing PostgreSQL configuration, and a non-HTTPS origin.

### Optional PostgreSQL server

```powershell
docker compose up -d
```

Set `DATABASE_URL=postgresql://campus:local-only-change-me@localhost:5432/campus` in `.env`, then run the seed and development commands. This uses a separate database from embedded mode. The Compose credentials are only for a loopback development database.

## Demo in three minutes

1. Sign in as **Student**, filter the catalog, and request an available camera with a purpose and return date.
2. Sign out and sign in as **Staff**. Open **Checkout requests** and approve it; the camera becomes reserved.
3. Record pickup, then record return. The equipment becomes available again.
4. Open **Activity log** and show the recorded transitions.
5. Sign in as **Admin** to add equipment and put an available item into maintenance.

The seed includes one checked-out laptop so return workflows are visible immediately. It adds missing fixtures without resetting an existing demo database. Pending requests do not reserve stock; approval reserves the specific physical asset. Return dates use UTC calendar dates, documented consistently across validation and display.

## Verify

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

Browser tests require a seeded local demo database. They create fictional requests and an inventory item. The API security suite runs against a fresh in-memory embedded database and covers ownership checks, role restrictions, CSRF, cookie flags, session rotation/expiry, login throttling, validation, state transitions, concurrency, and audit consistency.

CI also runs that security suite against a dedicated PostgreSQL service. To run it yourself, set `TEST_DATABASE_URL` to a **disposable test database**: the suite deletes all rows from the application tables there before each test. Never point it at development or production records.

Automated axe checks cover login, desktop catalog, request dialog, mobile catalog, staff requests, and activity log for WCAG A/AA rules. They supplement manual review and do not establish complete accessibility conformance.

## Documentation

- [Architecture, schema, and API](docs/ARCHITECTURE.md)
- [Security design and limitations](SECURITY.md)
- [Interview guide and practice questions](docs/INTERVIEW.md)
- [Deployment guide and future AWS architecture](docs/DEPLOYMENT.md)

## Future improvements

University SSO and MFA, email reminders, pagination, fine-grained staff scopes, inventory editing and retirement, accessible equipment photographs, and managed cloud deployment. See the security and deployment guides for the current operating limits. GitHub hosts this source and its screenshots; the running API needs a Node server and database.

## License

MIT. Dependencies retain their own licenses; DM Sans and Manrope font packages include their open font licenses.
