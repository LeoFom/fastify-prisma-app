import {FastifyReply, FastifyRequest} from "fastify";
import jwt from 'jsonwebtoken'
import {AuthRepository} from "../../modules/auth/auth.repository";

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

      // REFRESH TOKEN
      const payload =
        jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as {
          userId: string
          email: string
        }

      const dbSession = await repository.findSessionByToken(refreshToken);

      if (!dbSession) {
        // Если сессии в базе нет — значит токен отозван (был логаут).
        // Принудительно чистим куки "зомби" и выплевываем 401.
        reply.clearCookie('accessToken', { path: '/' });
        reply.clearCookie('refreshToken', { path: '/' });
        return reply.status(401).send({ message: 'Session expired or logged out' });
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

      reply.clearCookie('accessToken', { path: '/' });
      reply.clearCookie('refreshToken', { path: '/' });

      return reply.status(401).send({
        message: 'Unauthorized'
      });
    }
  }
}