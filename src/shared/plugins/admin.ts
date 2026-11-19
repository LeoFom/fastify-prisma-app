import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../config/prisma'

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.userId },
    select: { role: true },
  })
  if (user?.role !== 'Admin') return reply.code(403).send({ message: 'Admin access required' })
}
