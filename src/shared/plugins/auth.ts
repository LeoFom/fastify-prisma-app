import {FastifyReply, FastifyRequest} from "fastify";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    console.log("[authMiddleware] -> cookie - ", request.headers.cookie)

    await request.jwtVerify()

    console.log("[authMiddleware] -> user - ", request.user)
    console.log("[authMiddleware] -> userId - ", request.user.userId)

  } catch (error) {

    request.log.error(error)

    return reply.status(401).send({
      error: 'Unauthorized'
    })
  }
}