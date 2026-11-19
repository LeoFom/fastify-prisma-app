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
    userId: string
  }
) {
  reply.setCookie('accessToken', tokens.accessToken, cookieOptions)
  reply.setCookie('refreshToken', tokens.refreshToken, cookieOptions)
  reply.setCookie('userId', tokens.userId, cookieOptions)
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', { path: '/' })
  reply.clearCookie('refreshToken', { path: '/' })
  reply.clearCookie('userId', { path: '/' })
}
