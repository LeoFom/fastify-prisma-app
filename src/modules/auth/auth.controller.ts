import {FastifyReply, FastifyRequest} from "fastify";
import {loginSchema, registerSchema} from "./auth.schema";
import { AuthService } from './auth.service'
import '@fastify/cookie';
import 'dotenv/config';

export class AuthController {
  private authService = new AuthService();

  register = async (
    request: FastifyRequest,
    reply: FastifyReply
  )=>  {

    const body =
      registerSchema.parse(request.body)

    const user =
      await this.authService.register(body)

    return reply.status(201).send(user)
  }

  login = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {

    const body =
      loginSchema.parse(request.body)

    const result =
      await this.authService.login(body)

    reply.setCookie(
      'accessToken',
      result.accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      }
    )

    reply.setCookie(
      'refreshToken',
      result.refreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      }
    )

    return reply.send({
      success: true,
      user: result.user,
    })
  }

  me = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {

    return reply.send({
      id: request.user.userId,
      email: request.user.email,
    })
  }

  logout = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {

    const refreshToken =
      request.cookies.refreshToken

    if (refreshToken) {
      await this.authService.logout(
        refreshToken
      )
    }

    reply.clearCookie(
      'accessToken',
      {
        path: '/'
      }
    )

    reply.clearCookie(
      'refreshToken',
      {
        path: '/'
      }
    )

    return reply.send({
      success: true
    })
  }
}