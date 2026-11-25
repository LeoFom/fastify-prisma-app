import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { AuthRepository } from '../../modules/auth/auth.repository'
import { clearAuthCookies } from '../../modules/auth/auth-cookies'
import { verifyAccess } from '../../modules/auth/session-tokens'
import { sendMappedError } from '../http/errors'

const repository = new AuthRepository()

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.accessToken
  if (!accessToken)
    return sendMappedError(
      request,
      reply,
      new Error(request.cookies.refreshToken ? 'Access expired' : 'Unauthorized'),
    )

  let claims: ReturnType<typeof verifyAccess>
  try {
    claims = verifyAccess(accessToken)
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError && request.cookies.refreshToken)
      return sendMappedError(request, reply, new Error('Access expired'))
    clearAuthCookies(reply)
    return sendMappedError(request, reply, new Error('Unauthorized'))
  }

  // Every private request checks revocation. Refresh happens only at /auth/refresh.
  const session = await repository.findSessionById(claims.sid)
  if (
    !session ||
    session.userId !== claims.userId ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    clearAuthCookies(reply)
    return sendMappedError(request, reply, new Error('Session expired'))
  }
  request.user = { userId: session.userId, email: session.user.email, sid: session.id }
}
