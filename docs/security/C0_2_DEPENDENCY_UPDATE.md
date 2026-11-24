# C0.2 dependency security update

Date: 2026-11-24. Scope: compatible dependency updates, including build/development tools. This does not implement the remaining Coffeo roadmap steps.

Full `npm audit --json` changed from **18 affected package aggregates** (1 critical, 12 high, 4 moderate, 1 low) to **0 findings**, including dev dependencies. [Machine-readable risk register](C0_2_DEPENDENCY_AUDIT.json) records original package paths, versions, advisories, execution surfaces and patched versions. These counts are packages/aggregates, not independent confirmed exploits.

## Versions

| Package | Before | After |
| --- | --- | --- |
| Fastify | 5.8.5 | 5.12.8 |
| @fastify/jwt / fast-jwt | 10.1.0 / 6.2.4 | 10.2.9 / 6.3.7 |
| Prisma CLI / client / pg adapter | 7.8.0 | 7.10.1, aligned and pinned |
| Zod | 4.4.3 | 4.6.7 |
| Nodemailer | 8.0.7 | 10.6.1 |
| effect, through Prisma config | 3.20.0 | 3.22.5, scoped override |
| esbuild, development toolchain | 0.28.0 | 0.28.2 |

Compatible transitive updates also patch fast-uri, fast-copy, brace-expansion and the Prisma development/configuration chain. Exact resolved versions and integrity hashes are in package-lock.json.

## Compatibility decisions

Prisma stays on major 7; no schema or data migration is introduced. The CLI, @prisma/client and @prisma/adapter-pg versions match. Prisma config pins effect 3.20.0 upstream, so ordinary dependency resolution cannot remove that advisory. A narrowly scoped @prisma/config → effect 3.22.5 override stays within effect major 3. CLI generation/validation, compilation and database-backed tests verify compatibility. Re-evaluate/remove this override once upstream ships a patched compatible pin; do not jump to effect 4 or downgrade Prisma merely to satisfy an automated fix suggestion.

Nodemailer is the deliberate major upgrade. Version 9 enables TLS certificate verification for remote HTTPS content; verification remains enabled. Version 10 requires Node >=20, provides TypeScript types, and retains CommonJS support. This project runs Node 24; the existing createTransport/sendMail helper compiles without API changes. Removed the obsolete @types/nodemailer dependency. A new stream-transport test exercises the actual helper without SMTP/network or real mail. The helper remains unwired to public application routes; this patch does not activate email delivery.

The running API uses strong nonempty HMAC JWT secrets, not RSA/JWK keys. Several algorithm-confusion advisory prerequisites were therefore absent; other JWT parsing/replay advisories still justified updating the whole compatible authentication chain. No exploit against production was attempted.

## Verification and ongoing gate

- Clean lockfile installation locally with npm ci --ignore-scripts; explicit Prisma generation/build follows. GitHub CI performs ordinary npm ci with scripts on Linux.
- API build, TypeScript typecheck and Prisma validate passed.
- All 9 node:test checks passed against the isolated deployment-check PostgreSQL, including the C0.1 regression and the new offline mail compatibility test.
- The updated Next frontend and Fastify API passed browser signup/login, HttpOnly cookies, catalog/cart, checkout/order history, CSRF rejection, admin dashboard navigation and logout on synthetic test data.
- Full npm audit returned 0 findings. CI now explicitly runs `npm audit --audit-level=high` after installation, including development dependencies.

Linux CI migration/build/test and Render deployment are checked separately for the published commit; this report does not treat a locally unrun migration as successful. No production test users/orders were created.

A zero audit is a registry snapshot, not a guarantee against undisclosed vulnerabilities. Existing ts-node-dev/glob development-tool deprecation notices are not claimed fixed by this patch; the resolved graph has no reported advisories. Credential revocation (C0.3), project-wide lint/formatting setup (C0.4), and product behavior changes remain separate work.

References: [Nodemailer 9 release](https://github.com/nodemailer/nodemailer/releases/tag/v9.0.0), [Nodemailer 10 release](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0), [Prisma 7.10.1 release](https://github.com/prisma/orm/releases/tag/7.10.1).
