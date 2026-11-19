import {FastifyReply, FastifyRequest} from "fastify";
import jwt from 'jsonwebtoken'
import {AuthRepository} from "../../modules/auth/auth.repository";
import {hashToken} from "../../utils/hash-token";
import {clearAuthCookies} from "../../modules/auth/auth-cookies";

const repository = new AuthRepository()

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

      const payload =
        jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as {
          userId: string
        }

      const dbSession = await repository.findSessionByToken(
        hashToken(refreshToken)
      );

      if (!dbSession) {
        clearAuthCookies(reply)
        return reply.status(401).send({ message: 'Session expired or logged out' });
      }

      const user = await repository.findById(payload.userId)

      if (!user) {
        clearAuthCookies(reply)
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const newAccessToken =
        request.server.jwt.sign(
          {
            userId: user.id,
            email: user.email,
          },
          {
            expiresIn: '15m'
          }
        )

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

      request.user = {
        userId: user.id,
        email: user.email,
      }

    } catch {

      clearAuthCookies(reply)

      return reply.status(401).send({
        message: 'Unauthorized'
      });
    }
  }
}
