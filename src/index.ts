import { buildApp } from './app'
import { prisma } from './config/prisma'
import { promoteConfiguredAdmin } from './shared/promote-admin'
import { readRuntimeEnv } from './config/runtime-env'
import 'dotenv/config'

const start = async () => {
  const app = buildApp()
  const port = readRuntimeEnv().PORT

  try {
    await prisma.$connect()
    await promoteConfiguredAdmin()

    await app.listen({
      port: port,
      host: '0.0.0.0',
    })

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, async () => {
        await app.close()
        await prisma.$disconnect()
        process.exit(0)
      })
    }
  } catch (error) {
    app.log.error({ code: 'STARTUP_FAILED' }, 'Check database and environment configuration')

    process.exit(1)
  }
}

start()
