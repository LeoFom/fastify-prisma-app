# ADR-004: per-login sessions and bounded refresh replay

Status: accepted for C1.3 branch, 2026-11-25. Release to production is separate.

Each login creates one Session with a new UUID `sid` and random `jti`. Access and refresh JWTs have distinct keys, HS256, issuer, audience, token type and expiry. Refresh has a fixed seven-day absolute expiry from login. Only its hash and reproducible signing metadata are stored; no raw JWT is persisted.

Refresh locks the Session row in a PostgreSQL transaction. The first current-token request after ten seconds rotates once. The old hash remains valid for ten seconds; concurrent requests and a retry after a lost response receive the same canonical current token. A current token younger than ten seconds is returned unchanged. A signed older generation outside grace revokes the session. Revocation and absolute expiry override grace. An unsigned token cannot revoke a session by supplying an arbitrary `sid`.

The ten-second grace window permits a stolen old token to be used briefly. It is a deliberate availability tradeoff for browser tabs and lost responses, not a security guarantee. IP and user agent are not ownership proofs. A key change invalidates sessions signed by the old key; legacy sessions with no `sid/jti` require one new login. The signing key ID is currently `v1`; changing the key requires a coordinated release.

Every protected request reads the Session and rejects revoked or expired access. Expired access returns `ACCESS_EXPIRED` without rotating cookies. Browser recovery belongs to C1.4. Logout revokes the row, so previously issued access fails immediately. Password reset is not implemented yet; when added it must revoke affected sessions through the same state.
