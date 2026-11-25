import { randomUUID } from 'node:crypto'
import { AuthRepository } from './auth.repository'
import { comparePasswords, hashPassword } from './auth.utils'
import type { LoginInput, RegisterInput } from './auth.types'
import { hashToken } from '../../utils/hash-token'
import {
  graceSeconds,
  mintAccess,
  mintRefresh,
  newSessionIdentity,
  refreshFromSession,
  signingKeyId,
  verifyAccess,
  verifyRefresh,
} from './session-tokens'

const publicUser = (user: { id: string; email: string; role: 'Customer' | 'Admin' }) => ({
  id: user.id,
  email: user.email,
  role: user.role,
})

export class AuthService {
  private repository = new AuthRepository()
  constructor(private readonly now: () => Date = () => new Date()) {}

  async register(data: RegisterInput) {
    const email = data.email.trim().toLowerCase()
    if (await this.repository.findByEmail(email)) throw new Error('User already exists')
    const passwordHash = await hashPassword(data.password)
    return this.repository.createUserWithProfile({ email, passwordHash })
  }

  async login(data: LoginInput) {
    const user = await this.repository.findByEmail(data.email.trim().toLowerCase())
    if (!user || !(await comparePasswords(data.password, user.passwordHash)))
      throw new Error('Invalid credentials')

    const identity = newSessionIdentity(this.now().getTime())
    const refreshToken = mintRefresh({
      userId: user.id,
      sid: identity.sid,
      jti: identity.jti,
      issuedAt: identity.issuedAt,
      expiresAt: identity.expiresAt,
      keyId: signingKeyId,
    })
    await this.repository.createSession({
      id: identity.sid,
      userId: user.id,
      refreshToken: hashToken(refreshToken),
      currentJti: identity.jti,
      currentIssuedAt: new Date(identity.issuedAt * 1000),
      expiresAt: new Date(identity.expiresAt * 1000),
      signingKeyId,
    })
    return {
      accessToken: mintAccess(user, identity.sid),
      refreshToken,
      expiresAt: new Date(identity.expiresAt * 1000),
      user: publicUser(user),
    }
  }

  async refresh(refreshToken: string) {
    let claims: ReturnType<typeof verifyRefresh>
    try {
      claims = verifyRefresh(refreshToken)
    } catch {
      throw new Error('Invalid refresh token')
    }
    const suppliedHash = hashToken(refreshToken)
    const result = await this.repository.withLockedSession(claims.sid, async (session, tx) => {
      if (
        !session ||
        !session.currentJti ||
        !session.currentIssuedAt ||
        session.userId !== claims.userId ||
        session.revokedAt ||
        session.expiresAt <= this.now()
      )
        return null

      const now = this.now()
      if (session.refreshToken === suppliedHash) {
        if (now.getTime() - session.currentIssuedAt.getTime() < graceSeconds * 1000)
          return { session, token: refreshFromSession(session) }

        const jti = randomUUID()
        const issuedAt = Math.floor(now.getTime() / 1000)
        const token = mintRefresh({
          userId: session.userId,
          sid: session.id,
          jti,
          issuedAt,
          expiresAt: Math.floor(session.expiresAt.getTime() / 1000),
          keyId: signingKeyId,
        })
        const updated = await tx.session.update({
          where: { id: session.id },
          data: {
            refreshToken: hashToken(token),
            currentJti: jti,
            currentIssuedAt: new Date(issuedAt * 1000),
            previousRefreshHash: suppliedHash,
            previousValidUntil: new Date(now.getTime() + graceSeconds * 1000),
            rotationVersion: { increment: 1 },
            signingKeyId,
          },
          include: { user: true },
        })
        return { session: updated, token }
      }

      if (
        session.previousRefreshHash === suppliedHash &&
        session.previousValidUntil &&
        session.previousValidUntil >= now
      )
        return { session, token: refreshFromSession(session) }

      // A signed, old token for this session outside grace is a replay.
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: now, previousRefreshHash: null, previousValidUntil: null },
      })
      return null
    })
    if (!result) throw new Error('Session expired')
    return {
      accessToken: mintAccess(result.session.user, result.session.id),
      refreshToken: result.token,
      expiresAt: result.session.expiresAt,
      user: publicUser(result.session.user),
    }
  }

  async me(userId: string) {
    const user = await this.repository.findById(userId)
    if (!user) throw new Error('Unauthorized')
    return publicUser(user)
  }

  async logout(refreshToken?: string, accessToken?: string) {
    let identity: { sid: string; userId: string } | undefined
    try {
      if (refreshToken) identity = verifyRefresh(refreshToken)
    } catch {
      // A valid access cookie can still revoke the session.
    }
    if (!identity) {
      try {
        if (accessToken) identity = verifyAccess(accessToken)
      } catch {
        return
      }
    }
    if (identity) await this.repository.revokeSession(identity.sid, identity.userId)
  }
}
