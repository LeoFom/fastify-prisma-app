import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { AuthRepository } from '../../modules/auth/auth.repository'
import { clearAuthCookies } from '../../modules/auth/auth-cookies'
import { hashToken } from '../../utils/hash-token'
import { sendMappedError } from '../http/errors'

const repository = new AuthRepository()

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify({ onlyCookie: true })
    return
  } catch {
    // An expired or invalid access token can still recover through refresh.
  }

  const refreshToken = request.cookies.refreshToken
  if (!refreshToken) return sendMappedError(request, reply, new Error('Unauthorized'))

  let userId: string
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
      userId?: unknown
    }
    if (typeof payload.userId !== 'string') throw new Error('Invalid refresh token')
    userId = payload.userId
  } catch {
    clearAuthCookies(reply)
    return sendMappedError(request, reply, new Error('Invalid refresh token'))
  }

  let session: Awaited<ReturnType<AuthRepository['findSessionByToken']>>
  let user: Awaited<ReturnType<AuthRepository['findById']>>
  try {
    session = await repository.findSessionByToken(hashToken(refreshToken))
    user = session ? await repository.findById(userId) : null
  } catch (error) {
    // A database outage must not invalidate a still valid browser session.
    return sendMappedError(request, reply, error)
  }

  if (!session || session.userId !== userId || session.expiresAt <= new Date() || !user) {
    clearAuthCookies(reply)
    return sendMappedError(request, reply, new Error('Session expired'))
  }

  const accessToken = request.server.jwt.sign(
    { userId: user.id, email: user.email },
    { expiresIn: '15m' },
  )
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  request.user = { userId: user.id, email: user.email }
}
