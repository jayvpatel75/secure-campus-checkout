# Interview walkthrough

## Explain the project in 45 seconds

> CampusKit is a full-stack equipment checkout system for a campus. Students browse equipment and submit requests. Staff approve requests, record pickup, and record return, while administrators manage inventory. I used React and TypeScript for the interface, Express for the API, and PostgreSQL for persistent data. The security focus is server-side permissions: students cannot read another student's requests or call staff actions. Approval and inventory updates happen inside a database transaction so two staff members cannot reserve the same physical item. I used AI assistance during implementation and reviewed the workflow, code, and tests to understand the design.

Use the final sentence honestly: only claim review and understanding after you have completed them. Do not describe this demonstration as professional production experience or say it was deployed to AWS unless that deployment actually happens.

## Demonstrate in three minutes

1. Explain the problem: campus equipment needs clear ownership and an accountable lending process.
2. Student: search for a camera, open the request dialog, enter a purpose and return date, then submit.
3. Staff: approve the request. Explain that approval reserves the asset; submission alone does not.
4. Record pickup and return. Point out the inventory availability change.
5. Show the audit log, then the cross-user and concurrent-approval tests in the repository.

Use separate browser profiles or sign out between roles. All supplied accounts are fictional local fixtures.

## Likely questions

**Why this project for a full-stack developer role?**

It includes a user-facing catalog, forms, API calls, database relationships, access control, transactional business rules, testing, responsive layout, and documentation. The workflow makes the security decisions easy to demonstrate.

**Authentication versus authorization?**

Authentication establishes which user owns a session. Authorization decides which records and actions that user may access. A student may be authenticated and still receive 403 for an approval action or 404 for someone else's request.

**What prevents someone changing a loan ID in a URL?**

The backend checks the request's owner against the signed-in user. Student list queries are also scoped by user ID. Hiding a button would not protect the API. Show the test named “students only see their own loans.”

**Why store sessions in a database?**

The browser holds an opaque HttpOnly cookie. The database stores a hash of that token, user ID, CSRF value, and expiry. Logout revokes the row immediately. Login rotates both the session identifier and CSRF token. This avoids managing bearer tokens in browser storage.

**What prevents two approvals for the same equipment?**

Each approval locks its loan and the equipment row. Only the first transaction can change an available asset to reserved. The second sees the updated status and returns 409. A database partial unique index also prevents more than one approved or checked-out loan for the same asset. The audit write uses the same transaction, so a failed approval creates no successful approval event.

**Why PGlite and PostgreSQL?**

PGlite runs an embedded PostgreSQL engine for a simple local demo, with no Docker account or service setup. Production uses a normal PostgreSQL connection pool. PGlite has a single-connection execution model, so its adapter serializes operations. The same security suite runs against real PostgreSQL in CI to exercise row-lock behavior independently.

**How do you address accessibility?**

Labels connect to form fields, dialogs use the native focus-managed dialog element, keyboard focus is visible, a skip link bypasses navigation, errors are announced, and statuses have readable text. Axe checks run on desktop, mobile, login, forms, and staff pages. Automated checks are partial evidence, not certification.

**How are passwords stored?**

The server uses Node's scrypt with a fresh random salt for each password. It stores the salt and derived hash, never the plaintext. Verification uses a constant-time comparison. Demo passwords are intentionally public and blocked from production use.

**How would you host this on AWS?**

Build the frontend and serve it with the Node API behind HTTPS. A future deployment could use a container service, an application load balancer, private RDS PostgreSQL, Secrets Manager, and CloudWatch. That is a proposed design; AWS deployment is not part of this repository's completed implementation.

**What would you improve?**

SSO/MFA, request pagination, shared rate limiting, configurable campus timezone, scheduled reminders, stronger operational monitoring, and controlled migrations. Pick one improvement and explain the problem it solves.

## Read and practice

- Trace `GET /api/session` → login → cookie → a protected request in `server/app.ts`.
- Explain one ownership check and one staff/admin check.
- Draw users, equipment, loans, sessions, and audit events from memory.
- Trace approval and rollback in the database transaction.
- Run `npm run check` and explain the cross-user and race-condition tests.
- Walk the app with only the keyboard; explain what automated accessibility checks miss.

## Resume bullet after you understand the implementation

> Developed an AI-assisted React, TypeScript, Express, and PostgreSQL campus equipment checkout application with role-based authorization, CSRF-protected sessions, transactional reservation controls, audit logging, and automated API and browser tests.

Add verified outcomes only. Avoid invented performance statistics, real user counts, production claims, or AWS deployment claims.
