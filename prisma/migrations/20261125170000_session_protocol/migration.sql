-- Existing sessions have no sid/jti and cannot be safely rotated. They remain
-- until expiry and require one new login after the coordinated release.
ALTER TABLE "sessions"
  ADD COLUMN "currentJti" UUID,
  ADD COLUMN "currentIssuedAt" TIMESTAMP(3),
  ADD COLUMN "previousRefreshHash" TEXT,
  ADD COLUMN "previousValidUntil" TIMESTAMP(3),
  ADD COLUMN "rotationVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "signingKeyId" TEXT;

CREATE UNIQUE INDEX "sessions_currentJti_key" ON "sessions"("currentJti");
CREATE UNIQUE INDEX "sessions_previousRefreshHash_key" ON "sessions"("previousRefreshHash");
CREATE INDEX "sessions_expiresAt_revokedAt_idx" ON "sessions"("expiresAt", "revokedAt");

-- Fail rather than silently merge accounts with colliding canonical emails.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "users" GROUP BY lower(btrim("email")) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Canonical email collision: resolve before session migration';
  END IF;
END $$;
UPDATE "users" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));
CREATE UNIQUE INDEX "users_email_canonical_key" ON "users"(lower(btrim("email")));
