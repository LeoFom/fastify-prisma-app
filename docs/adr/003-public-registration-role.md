# ADR-003 amendment: public registration always creates Customer

Status: accepted, 2026-11-24. Scope: C0.1.

The legacy `ADMIN_EMAIL` comparison in AuthRepository allowed an unverified registration to acquire administrative permissions merely by matching a configured mailbox. This supersedes the registration-based provisioning rule in the frontend's original ADR-003; the Customer/Admin role model and database-backed admin guard stay unchanged.

## Decision

- The public registration schema accepts only email and password. Additional fields, including role, id, userId and passwordHash, produce HTTP 400 before account creation.
- AuthRepository.createUser uses an explicit allowlist of email/passwordHash and always persists role Customer. It does not read ADMIN_EMAIL or spread the caller's object into Prisma data.
- Registration responses omit passwordHash. Login and auth/me return the persisted Customer role; this account cannot mutate products.
- First-admin provisioning remains the separate ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD startup operation. It does not promote an existing unverified registration. The bootstrap implementation is unchanged in this patch.
- No existing role is demoted, no schema migration is needed, and no new public role-management endpoint is introduced.

## Verification

`tests/registration-security.test.cjs` sets ADMIN_EMAIL to each synthetic registration address, verifies the saved role and admin denial, and rejects caller-owned role/id/userId/passwordHash fields without creating an account. The existing deployment integration test continues to exercise registration/login, legitimate admin access, cart ownership, checkout and logout.

Use only NODE_ENV=test with an isolated database for integration tests. Fixtures use unique example.test addresses, and cleanup targets only those exact addresses. Tests run against disposable PostgreSQL in GitHub CI; no synthetic registrations are needed in production.

This decision does not close the other dependency, credential-rotation, session, stock or checkout findings in the Coffeo audit. Those remain separate tasks.
