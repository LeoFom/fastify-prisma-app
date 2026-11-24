# Coffeo API: Render Free + Neon Free

Deploy branch: `dev`. Frontend repository: `LeoFom/coffee-shop`, also `dev`. Keep the Fastify JWT + Next BFF architecture.

## Render

Use the repository's `render.yaml`, or create a Node Web Service in Frankfurt with the Free instance type:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm run db:deploy && npm start`
- Health: `/health/ready`; process-only liveness: `/health/live`
- Node: 24.x; bind: `0.0.0.0` and Render's `PORT`

Both health endpoints are public and contain no credentials. Other routes require the server-to-server `x-coffeo-api-key` header. Private routes additionally require a user session; product mutations require a current Admin role read from the database. The browser calls Next BFF, not Render directly; browser CORS access to Render is unnecessary.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL for runtime traffic, TLS certificate verification enabled |
| `DIRECT_URL` | Direct PostgreSQL URL for Prisma migrations |
| `JWT_ACCESS_SECRET` | Independent random secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | A different independent random secret |
| `COOKIE_SECRET` | A different independent random secret |
| `INTERNAL_API_KEY` | Shared only by Render and Vercel server environments |
| `NODE_ENV` | `production` on Render |
| `NOVA_POSHTA_API_KEY` | Optional until Nova Poshta delivery is enabled |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | Optional initial admin creation; password minimum 12 characters |

Generate secrets with a password manager or `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Do not place secrets in public `NEXT_PUBLIC_*` variables or Git. Add values directly to Render/Vercel settings.

Admin bootstrap creates a new admin only when no admin exists. It does not promote an existing registration with the same email. After the first successful login, remove the bootstrap password from the Render environment. No default admin credentials or seeded production customer/product data are provided.

Public registration accepts exactly `email` and `password`, always persists `Customer`, and rejects extra fields with HTTP 400. The legacy `ADMIN_EMAIL` variable has no effect. Administrative provisioning is separate from public registration; see [the registration security decision](docs/adr/003-public-registration-role.md). Existing roles are not rewritten by this change.

The old tracked `src/config/env.ts` was removed from `dev`; its historical MongoDB/email credentials must be revoked by their owner. Historical commits and the legacy `main` branch may still contain them. Removing the current file does not rotate credentials. No old credentials are used for this deployment.

## Database safety

Neon project `coffeo` is separate from Lead Finder. Test schema changes on `deployment-check` before production. Use a direct URL for migrations and a pooled URL for the running API. Never run `migrate reset` or `migrate dev` against the deployed database.

The existing migration history includes a migration that drops legacy Todo tables. It is tested as a complete chain on a fresh empty database. An existing database with data requires its own migration/backup review; do not point this deployment at another project's database.

The GitHub workflow starts a disposable PostgreSQL 17, generates Prisma, builds TypeScript, runs `prisma migrate deploy`, then exercises health, proxy authentication, registration/login, role checks, cart isolation, server-priced checkout, order isolation and logout. Local integration tests require an isolated database and `NODE_ENV=test`.

```sh
npm ci --include=dev
npm run build
npm run db:validate
npm run typecheck
npm test
```

On this Windows agent, Prisma's native migration connector returned an unspecified schema-engine error while `pg` connected successfully. Local tests used the existing migration SQL on an explicitly checked empty test branch; they do not assert that the native migration CLI succeeded. The Linux CI migration and Render migration are verified separately.

## Free-tier limits and remaining integrations

Neon Free currently includes 1 GB and 100 CU-hours per project per month. Render Free sleeps after 15 idle minutes; its 750 monthly instance-hours are shared by the workspace's free web services, including other projects. Cold starts can delay the first request. Free Render PostgreSQL expires after 30 days, so this deployment uses external Neon instead. Quotas and prices may change. [Neon](https://neon.com/pricing) · [Render](https://render.com/docs/free)

Nova Poshta requires its own key. Until configured its routes return 503 without making upstream calls. No live shipping-label purchase or email sending is enabled by deployment. Checkout's payment records are not an integration with a card payment provider; real online payment, transactional email, loyalty/newsletter behavior and importing real products are separate work. An empty database initially has no catalog; add products through an admin account.
