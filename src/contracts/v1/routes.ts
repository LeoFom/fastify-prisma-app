import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { prisma } from '../../config/prisma'
import { authMiddleware } from '../../shared/plugins/auth'
import { adminMiddleware } from '../../shared/plugins/admin'
import { productInclude, toProductDTO, toProfileDTO } from './mappers'
import {
  productIdParam,
  productQuery,
  productSlugParam,
  productResponse,
  productsResponse,
  profilePatch,
  profileResponse,
  reservedCartWrite,
  reservedCheckoutWrite,
} from './schema'

function fail(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  code: string,
  message: string,
  fieldErrors: Record<string, string[]> = {},
) {
  return reply.code(status).send({ error: { code, message, fieldErrors, requestId: request.id } })
}

export async function v1Routes(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode < 400 || !payload || typeof payload !== 'string') return payload
    try {
      const parsed: unknown = JSON.parse(payload)
      if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) return payload
      return JSON.stringify({
        error: {
          code:
            reply.statusCode === 401
              ? 'UNAUTHORIZED'
              : reply.statusCode === 403
                ? 'FORBIDDEN'
                : 'REQUEST_FAILED',
          message:
            reply.statusCode === 401
              ? 'Unauthorized'
              : reply.statusCode === 403
                ? 'Forbidden'
                : 'Request failed',
          fieldErrors: {},
          requestId: request.id,
        },
      })
    } catch {
      return payload
    }
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of error.issues) {
        const key = issue.path.map(String).join('.') || '_root'
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return fail(reply, request, 400, 'VALIDATION_FAILED', 'Validation failed', fieldErrors)
    }
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 400) {
      return fail(reply, request, 400, 'VALIDATION_FAILED', 'Invalid request body')
    }
    request.log.error({ code: 'V1_REQUEST_FAILED', requestId: request.id })
    return fail(reply, request, 500, 'INTERNAL_ERROR', 'Internal server error')
  })

  app.setNotFoundHandler((request, reply) =>
    fail(reply, request, 404, 'NOT_FOUND', 'Resource not found'),
  )

  app.get('/products', async (request, reply) => {
    const query = productQuery.parse(request.query)
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.roast ? { coffeeDetails: { roast: query.roast } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [{ name: 'asc' }, { id: 'asc' }]
        : query.sort === 'price_asc'
          ? [{ price: 'asc' }, { id: 'asc' }]
          : query.sort === 'price_desc'
            ? [{ price: 'desc' }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'asc' }]
    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return reply.send(
      productsResponse.parse({
        data: rows.map(toProductDTO),
        page: { number: query.page, size: query.pageSize, total },
      }),
    )
  })

  app.get('/products/:id', async (request, reply) => {
    const { id } = productIdParam.parse(request.params)
    const row = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: productInclude,
    })
    if (!row) return fail(reply, request, 404, 'NOT_FOUND', 'Product not found')
    return reply.send(productResponse.parse({ data: toProductDTO(row) }))
  })

  app.get('/products/slug/:slug', async (request, reply) => {
    const { slug } = productSlugParam.parse(request.params)
    const row = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: productInclude,
    })
    if (!row) return fail(reply, request, 404, 'NOT_FOUND', 'Product not found')
    return reply.send(productResponse.parse({ data: toProductDTO(row) }))
  })

  app.get('/profile/me', { preHandler: authMiddleware }, async (request, reply) => {
    const row = await prisma.profile.findUnique({ where: { userId: request.user.userId } })
    return reply.send(profileResponse.parse({ data: row ? toProfileDTO(row) : null }))
  })

  app.patch('/profile/me', { preHandler: authMiddleware }, async (request, reply) => {
    const input = profilePatch.parse(request.body)
    const row = await prisma.profile.upsert({
      where: { userId: request.user.userId },
      create: { userId: request.user.userId, ...input },
      update: input,
    })
    return reply.send(profileResponse.parse({ data: toProfileDTO(row) }))
  })

  // These shapes are validated now so callers never mistake legacy, client-priced
  // cart/checkout writes for the future revision-aware contract.
  app.post('/cart/items', { preHandler: authMiddleware }, async (request, reply) => {
    reservedCartWrite.parse(request.body)
    return fail(
      reply,
      request,
      501,
      'FEATURE_NOT_AVAILABLE',
      'Revision-aware cart is not available yet',
    )
  })
  app.post('/orders', { preHandler: authMiddleware }, async (request, reply) => {
    reservedCheckoutWrite.parse(request.body)
    return fail(
      reply,
      request,
      501,
      'FEATURE_NOT_AVAILABLE',
      'Quote-based checkout is not available yet',
    )
  })
  app.post(
    '/admin/products',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      // Product writes need C2 stock and coffee detail invariants. Reject the
      // entire operation; never silently drop submitted fields.
      if (request.body === undefined)
        return fail(reply, request, 400, 'VALIDATION_FAILED', 'Body is required')
      return fail(
        reply,
        request,
        501,
        'FEATURE_NOT_AVAILABLE',
        'Product writes are not available in v1 yet',
      )
    },
  )
}
