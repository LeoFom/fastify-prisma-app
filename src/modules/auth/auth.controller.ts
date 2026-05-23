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
  )=>  {

    const body =
      loginSchema.parse(request.body)

    const tokens =
      await this.authService.login(body)

    reply.setCookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      signed: true,
    })

    reply.setCookie(
      'refreshToken',
      tokens.refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        signed: true,
      }
    )

    return reply.send({
      accessToken: tokens.accessToken
    })
  }


  refresh = async (
    request: FastifyRequest,
    reply: FastifyReply
  )=>  {

    request.log.info(request.headers);

    const refreshToken = request.cookies.refreshToken

    if(!refreshToken) {
      return reply.status(401).send({
        message: 'Unauthorized'
      })
    }

    const tokens = await this.authService.refresh(
      refreshToken
    )

    reply.setCookie(
      'accessToken',
      tokens.accessToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        signed: true,
        path: '/'
      }
    )

    reply.setCookie(
      'refreshToken',
      tokens.refreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        signed: true,
        path: '/'
      }
    )

    return reply.send({
      success: true,
      // accessToken: tokens.accessToken
    })
  }

  logout = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const refreshToken =
      request.cookies.refreshToken

    if(refreshToken){
      await this.authService.logout(
        refreshToken
      )
    }

    reply.clearCookie(
      'refreshToken',
      {
        path: '/'
      }
    )

    return reply.status(200).send({
      success: true
    })
  }
}