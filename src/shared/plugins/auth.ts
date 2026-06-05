import {FastifyReply, FastifyRequest} from "fastify";
import jwt from 'jsonwebtoken'

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {

  try {

    // ACCESS TOKEN
    await request.jwtVerify({
      onlyCookie: true
    })

  } catch {

    const refreshToken =
      request.cookies.refreshToken

    if (!refreshToken) {

      return reply.status(401).send({
        message: 'Unauthorized'
      })
    }

    try {

      // REFRESH TOKEN
      const payload =
        jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as {
          userId: string
          email: string
        }

      // NEW ACCESS TOKEN
      const newAccessToken =
        request.server.jwt.sign(
          {
            id: payload.userId,
            email: payload.email,
          },
          {
            expiresIn: '15m'
          }
        )

      // NEW COOKIE
      reply.setCookie(
        'accessToken',
        newAccessToken,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        }
      )

      // IMPORTANT
      request.user = payload

    } catch {

      return reply.status(401).send({
        message: 'Unauthorized'
      })
    }
  }
}