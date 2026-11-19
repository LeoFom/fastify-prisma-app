import { hash } from 'bcrypt'
import { prisma } from '../config/prisma'

/** Optional initial admin creation. Never promotes an existing unverified registration. */
export async function promoteConfiguredAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (!email && !password) return
  if (!email || !password || password.length < 12) throw new Error('Invalid admin bootstrap configuration')
  const passwordHash = await hash(password, 12)
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(631706)`
    if (await tx.user.count({ where: { role: 'Admin' } })) return
    if (await tx.user.findUnique({ where: { email } }))
      throw new Error('Bootstrap email already belongs to a registered account')
    await tx.user.create({ data: { email, passwordHash, role: 'Admin', profile: { create: {} } } })
  })
}
