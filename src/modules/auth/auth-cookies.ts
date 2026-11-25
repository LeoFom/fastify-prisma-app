import { FastifyReply } from 'fastify'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: Date
  },
) {
  reply.setCookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 })
  reply.setCookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: Math.max(0, Math.floor((tokens.expiresAt.getTime() - Date.now()) / 1000)),
  })
  // Remove the legacy hint cookie; the server never trusts it for identity.
  reply.clearCookie('userId', { path: '/' })
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', { path: '/' })
  reply.clearCookie('refreshToken', { path: '/' })
  reply.clearCookie('userId', { path: '/' })
}
