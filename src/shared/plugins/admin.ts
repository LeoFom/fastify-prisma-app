import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../config/prisma'
import { sendMappedError } from '../http/errors'

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.userId },
    select: { role: true },
  })
  if (user?.role !== 'Admin') return sendMappedError(request, reply, { statusCode: 403 })
}
