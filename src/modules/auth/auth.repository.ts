import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  // The optional writer allows a synthetic profile failure to prove rollback in CI.
  createUserWithProfile(
    data: { email: string; passwordHash: string },
    writeProfile: (tx: Prisma.TransactionClient, userId: string) => Promise<unknown> = (
      tx,
      userId,
    ) => tx.profile.create({ data: { userId } }),
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...data, role: 'Customer' } })
      await writeProfile(tx, user.id)
      return user
    })
  }

  createSession(data: {
    id: string
    userId: string
    refreshToken: string
    currentJti: string
    currentIssuedAt: Date
    expiresAt: Date
    signingKeyId: string
  }) {
    return prisma.session.create({ data })
  }

  findSessionById(id: string) {
    return prisma.session.findUnique({ where: { id }, include: { user: true } })
  }

  // The lock serializes refresh across API instances and browser tabs.
  withLockedSession<T>(
    sid: string,
    callback: (
      session: Awaited<ReturnType<AuthRepository['findSessionById']>>,
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${sid}::uuid FOR UPDATE`
      const session = await tx.session.findUnique({ where: { id: sid }, include: { user: true } })
      return callback(session, tx)
    })
  }

  async revokeSession(sid: string, userId: string) {
    await prisma.session.updateMany({
      where: { id: sid, userId, revokedAt: null },
      data: { revokedAt: new Date(), previousRefreshHash: null, previousValidUntil: null },
    })
  }
}
