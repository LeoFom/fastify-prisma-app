import Fastify from 'fastify'
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
import { timingSafeEqual } from 'node:crypto'
import { ZodError } from 'zod'
import { v1Routes } from './contracts/v1/routes'

export const buildApp = () => {
  const secret = process.env.JWT_ACCESS_SECRET
  const secretCookie = process.env.COOKIE_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  const databaseUrl = process.env.DATABASE_URL

  if (!secret) throw new Error('JWT_ACCESS_SECRET is missing')
  if (!secretCookie) throw new Error('COOKIE_SECRET is missing')
  if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is missing')
  if (!databaseUrl) throw new Error('DATABASE_URL is missing')

  const internalKey = process.env.INTERNAL_API_KEY
  if (process.env.NODE_ENV === 'production' && !internalKey)
    throw new Error('INTERNAL_API_KEY is missing')
  for (const value of [secret, secretCookie, refreshSecret]) {
    if (value.length < 32) throw new Error('Auth secrets must be at least 32 characters')
  }
  const app = Fastify({
    bodyLimit: 65536,
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
    if (path === '/health/live' || path === '/health/ready') return
    reply.header('cache-control', 'no-store')
    if (!internalKey) return
    const supplied = request.headers['x-coffeo-api-key']
    if (
      typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(internalKey) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(internalKey))
    ) {
      return reply.code(401).send(
        path.startsWith('/v1/')
          ? {
              error: {
                code: 'UNAUTHORIZED',
                message: 'Unauthorized',
                fieldErrors: {},
                requestId: request.id,
              },
            }
          : { message: 'Unauthorized' },
      )
    }
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
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ message: 'Validation failed' })
    const failure = error instanceof Error ? error : new Error('Request failed')
    const code = 'statusCode' in failure ? failure.statusCode : undefined
    const status =
      typeof code === 'number' && code >= 400 && code < 500
        ? code
        : failure.message === 'Invalid credentials'
          ? 401
          : failure.message === 'User already exists'
            ? 409
            : 500
    if (status === 500) request.log.error({ code: 'REQUEST_FAILED', requestId: request.id })
    return reply
      .code(status)
      .send({ message: status === 500 ? 'Internal server error' : failure.message })
  })

  app.register(fastifyCookie, {
    secret: secretCookie,
  })

  app.register(fastifyJwt, {
    secret: secret,
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
