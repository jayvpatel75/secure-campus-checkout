# Security design

This is a portfolio application with explicit, testable security controls. It has not received an independent penetration test and does not claim OWASP or accessibility certification. Use fictional data for demonstrations.

## Threats and controls

| Threat                                             | Implemented control                                                                                   | Evidence                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| Student reads or cancels another student's loan    | Server-side role and ownership checks; unauthorized IDs return 404                                    | Cross-user API test              |
| Student calls a staff/admin endpoint directly      | Role checks in API handlers, independent of UI                                                        | Role restriction tests           |
| Session theft through browser JavaScript           | HttpOnly cookie; Secure in production; no bearer tokens in localStorage                               | Cookie tests                     |
| Session fixation or reuse after logout             | New token and CSRF value on login; database deletion on logout; eight-hour absolute expiry            | Rotation and expiry tests        |
| Stolen session database                            | Only SHA-256 digests of 256-bit random session identifiers are stored                                 | Session creation code            |
| Cross-site request forgery, including login/logout | Strict SameSite cookie, exact origin validation, session-bound CSRF header compared in constant time  | CSRF and origin tests            |
| Password database disclosure                       | Node scrypt with random 128-bit salt and 512-bit derived key; constant-time comparison                | Hashing tests                    |
| Login brute force / user enumeration               | Failed-attempt rate limit; generic errors; dummy password derivation for unknown emails               | Throttling and credential tests  |
| SQL injection                                      | Parameterized SQL; fixed query structure                                                              | SQL-payload test                 |
| Stored script injection                            | React text escaping; no raw HTML rendering; production CSP from Helmet                                | Rendering design and header test |
| Double-booking or inconsistent records             | Row locks, transactions, partial unique index; audit event committed with workflow change             | Concurrent approval test         |
| Self-approval                                      | Request creator cannot approve their own request, including administrators                            | Self-approval test               |
| Overlarge or invalid input                         | 16 KB JSON limit, Zod field validation, bounded descriptions and return dates                         | Input validation tests           |
| Accidental demo exposure                           | Explicit seed flag; loopback development binding; production rejects demo users and embedded database | Startup configuration guards     |

## Boundaries

- Students can browse the shared catalog, but can read only their own requests. Staff/admins can read borrower names, emails, purposes, and the audit log as part of the lending workflow.
- Audit events are append-only through the API, **not tamper-proof** against a database administrator. No delete/update audit endpoint exists. Event storage has no retention policy yet; the UI exposes only the newest 200 events.
- No login attempt passwords, session identifiers, or CSRF tokens are written to application logs. Error logging emits only the error message. Successful sign-ins are audited; failed sign-ins are rate limited but are not yet durably audited.
- Session CSRF values are readable by their owning client and stored in the database. Session cookie identifiers are not returned in JSON. Password hashes are never returned to the browser.
- The embedded database is for local use in a single process. Production requires a separate PostgreSQL database.

## Operating limits and next steps

1. Replace local accounts with university SSO/OIDC and MFA before real campus use. There is no password reset, account disabling, or public registration. Operators create accounts with `npm run user:create`.
2. Rate limiting uses process-local memory and the direct connection's IP. For multiple replicas, use a shared limiter store. Configure a narrowly scoped trusted proxy policy for the actual deployment before enabling proxy headers; the application intentionally does not blindly trust forwarded IPs.
3. Public `GET /api/session` creates a short-lived anonymous session. Deploy edge request throttling to bound anonymous session creation and application writes. Expired sessions are cleaned during new-session issuance; there is no scheduled cleanup job.
4. Add pagination before supporting large catalogs or request histories. No attachments are accepted; malware scanning is therefore outside the current scope.
5. Use HTTPS, private database networking, TLS certificate validation, least-privilege database roles, backups, and secrets management for hosting. Database schema creation currently runs at startup; use a controlled, versioned migration process before scaling deployment.
6. Input date rules use UTC. A real campus deployment should agree on a campus timezone and pickup/return cutoffs.
7. Security headers and automated tests reduce specific risks; they do not prove that the entire application is secure. Automated axe results do not replace keyboard and assistive-technology testing.

## Reporting

For a suspected issue, contact the repository owner through their GitHub profile. Avoid posting credentials or private borrower information in public issues. This repository has no paid support or guaranteed response time.

## References

- [Express production security practices](https://expressjs.com/en/advanced/best-practice-security/)
- [OWASP Application Security Verification Standard](https://asvs.owasp.org/)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html)
- [W3C accessible forms guidance](https://www.w3.org/WAI/tutorials/forms/)
