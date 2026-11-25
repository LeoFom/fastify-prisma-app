import Fastify, { LogController } from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import { authRoutes } from './modules/auth/auth.routes'
import 'dotenv/config'
import { profileRoutes } from './modules/profile/profile.routes'
import { productRoutes } from './modules/product/product.routes'
import { cartRoutes } from './modules/cart/cart.routes'
import { novaPoshtaRouter } from './modules/nova-poshta/nova-poshta.routes'
import { orderRoutes } from './modules/order/order.routes'
import { prisma } from './config/prisma'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { v1Routes } from './contracts/v1/routes'
import { readRuntimeEnv } from './config/runtime-env'
import { sendMappedError } from './shared/http/errors'

export const buildApp = () => {
  const env = readRuntimeEnv()
  const internalKey = env.INTERNAL_API_KEY
  const app = Fastify({
    bodyLimit: 65536,
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: (request) => {
      const supplied = request.headers['x-request-id']
      return typeof supplied === 'string' && /^[A-Za-z0-9._-]{8,64}$/.test(supplied)
        ? supplied
        : randomUUID()
    },
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            level: 'info',
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'req.headers["x-coffeo-api-key"]',
              'res.headers["set-cookie"]',
            ],
          },
  })
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0]
    reply.header('x-request-id', request.id)
    reply.header('cache-control', 'no-store')
    if (path === '/health/live' || path === '/health/ready') return
    if (!internalKey) return
    const supplied = request.headers['x-coffeo-api-key']
    if (
      typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(internalKey) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(internalKey))
    ) {
      return sendMappedError(request, reply, new Error('Unauthorized'))
    }
  })
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'UNMATCHED',
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    )
  })
  app.get('/health/live', async () => ({ status: 'ok' }))
  app.get('/health/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
  app.setErrorHandler((error, request, reply) => sendMappedError(request, reply, error))

  app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
  })

  app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  })

  app.register(authRoutes, {
    prefix: '/auth',
  })

  app.register(profileRoutes, {
    prefix: '/profile',
  })

  app.register(productRoutes, {
    prefix: '/products',
  })

  app.register(cartRoutes, {
    prefix: '/cart',
  })

  app.register(novaPoshtaRouter, {
    prefix: '/nova-poshta',
  })

  app.register(orderRoutes, {
    prefix: '/orders',
  })

  app.register(v1Routes, { prefix: '/v1' })

  return app
}
