import { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema, registerSchema } from './auth.schema'
import { AuthService } from './auth.service'
import { clearAuthCookies, setAuthCookies } from './auth-cookies'
import '@fastify/cookie'
import 'dotenv/config'
import { isDatabaseUnavailable, sendMappedError } from '../../shared/http/errors'

export class AuthController {
  private authService = new AuthService()

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body)

    const user = await this.authService.register(body)

    const { passwordHash: _passwordHash, ...safeUser } = user

    return reply.status(201).send(safeUser)
  }

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body)

    const result = await this.authService.login(body)

    setAuthCookies(reply, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    })

    return reply.send({
      success: true,
      user: result.user,
    })
  }

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.authService.me(request.user.userId)
    return reply.send(user)
  }

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken

    if (!refreshToken) {
      return reply.status(401).send({
        message: 'Unauthorized',
      })
    }

    try {
      const result = await this.authService.refresh(refreshToken)

      setAuthCookies(reply, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      })

      return reply.send({
        success: true,
        user: result.user,
      })
    } catch (error) {
      if (
        !isDatabaseUnavailable(error) &&
        error instanceof Error &&
        ['Invalid refresh token', 'Session expired'].includes(error.message)
      )
        clearAuthCookies(reply)
      return sendMappedError(request, reply, error)
    }
  }

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken

    await this.authService.logout(refreshToken, request.cookies.accessToken)

    clearAuthCookies(reply)

    return reply.send({
      success: true,
    })
  }
}
