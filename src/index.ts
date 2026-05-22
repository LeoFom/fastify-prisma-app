import { buildApp } from './app'
import { prisma } from './config/prisma'
import 'dotenv/config';

const start = async () => {

  const app = buildApp()
  const port = Number(process?.env?.PORT) || 3001

  try {

    await prisma.$connect()

    await app.listen({
      port: port
    })

    console.log('Server started')

  } catch (error) {

    app.log.error(error)

    process.exit(1)
  }
}

start()