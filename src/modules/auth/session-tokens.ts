import { randomUUID } from 'node:crypto'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { hashToken } from '../../utils/hash-token'

const issuer = 'coffeo-api'
const accessAudience = 'coffeo-access'
const refreshAudience = 'coffeo-refresh'
export const sessionSeconds = 7 * 24 * 60 * 60
export const graceSeconds = 10
export const signingKeyId = 'v1'

type SessionClaims = JwtPayload & {
  userId: string
  sid: string
  tokenType: 'access' | 'refresh'
  jti?: string
  email?: string
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function verify(token: string, secret: string, audience: string, type: 'access' | 'refresh') {
  const checked = jwt.verify(token, secret, {
    complete: true,
    algorithms: ['HS256'],
    issuer,
    audience,
  })
  if (
    typeof checked.payload !== 'object' ||
    checked.header.kid !== signingKeyId ||
    checked.payload.tokenType !== type ||
    !isUuid(checked.payload.userId) ||
    !isUuid(checked.payload.sid) ||
    (type === 'refresh' && !isUuid(checked.payload.jti)) ||
    (type === 'access' && typeof checked.payload.email !== 'string')
  )
    throw new Error('Invalid token')
  return checked.payload as SessionClaims
}

export function verifyAccess(token: string) {
  return verify(token, process.env.JWT_ACCESS_SECRET!, accessAudience, 'access')
}

export function verifyRefresh(token: string) {
  return verify(token, process.env.JWT_REFRESH_SECRET!, refreshAudience, 'refresh')
}

export function mintAccess(user: { id: string; email: string }, sid: string) {
  return jwt.sign(
    { userId: user.id, sid, email: user.email, tokenType: 'access' },
    process.env.JWT_ACCESS_SECRET!,
    {
      algorithm: 'HS256',
      issuer,
      audience: accessAudience,
      expiresIn: '15m',
      header: { alg: 'HS256', kid: signingKeyId },
    },
  )
}

export function mintRefresh(input: {
  userId: string
  sid: string
  jti: string
  issuedAt: number
  expiresAt: number
  keyId: string
}) {
  if (input.keyId !== signingKeyId) throw new Error('Unknown signing key')
  return jwt.sign(
    {
      userId: input.userId,
      sid: input.sid,
      jti: input.jti,
      tokenType: 'refresh',
      iss: issuer,
      aud: refreshAudience,
      iat: input.issuedAt,
      exp: input.expiresAt,
    },
    process.env.JWT_REFRESH_SECRET!,
    { algorithm: 'HS256', header: { alg: 'HS256', kid: input.keyId } },
  )
}

export function newSessionIdentity(now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  return { sid: randomUUID(), jti: randomUUID(), issuedAt, expiresAt: issuedAt + sessionSeconds }
}

export function refreshFromSession(session: {
  id: string
  userId: string
  currentJti: string | null
  currentIssuedAt: Date | null
  expiresAt: Date
  signingKeyId: string | null
  refreshToken: string
}) {
  if (!session.currentJti || !session.currentIssuedAt || !session.signingKeyId)
    throw new Error('Session expired')
  const raw = mintRefresh({
    userId: session.userId,
    sid: session.id,
    jti: session.currentJti,
    issuedAt: Math.floor(session.currentIssuedAt.getTime() / 1000),
    expiresAt: Math.floor(session.expiresAt.getTime() / 1000),
    keyId: session.signingKeyId,
  })
  if (hashToken(raw) !== session.refreshToken) throw new Error('Session token mismatch')
  return raw
}
