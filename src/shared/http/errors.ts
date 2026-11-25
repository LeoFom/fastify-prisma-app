import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

type Failure = {
  status: number
  code: string
  message: string
  fieldErrors: Record<string, string[]>
  retryAfter?: number
}
const unavailableCodes = new Set([
  'P1001',
  'P1002',
  'P1017',
  'P2024',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EACCES',
])
const messages: Record<number, { code: string; message: string }> = {
  400: { code: 'VALIDATION_FAILED', message: 'Validation failed' },
  401: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  403: { code: 'FORBIDDEN', message: 'Forbidden' },
  404: { code: 'NOT_FOUND', message: 'Resource not found' },
  409: { code: 'CONFLICT', message: 'Request conflicts with current state' },
  429: { code: 'RATE_LIMITED', message: 'Too many requests' },
}

function errorCode(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('code' in value)) return undefined
  return typeof value.code === 'string' ? value.code : undefined
}

export function isDatabaseUnavailable(value: unknown): boolean {
  let current = value
  for (let depth = 0; depth < 3; depth++) {
    if (!current || typeof current !== 'object') return false
    if (
      unavailableCodes.has(errorCode(current) ?? '') ||
      current.constructor?.name === 'PrismaClientInitializationError'
    )
      return true
    current = 'cause' in current ? current.cause : undefined
  }
  return false
}

export function classifyError(error: unknown): Failure {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const path = issue.path.map(String).join('.') || '_root'
      ;(fieldErrors[path] ??= []).push(issue.message)
    }
    return { status: 400, ...messages[400]!, fieldErrors }
  }
  if (isDatabaseUnavailable(error))
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable',
      fieldErrors: {},
      retryAfter: 5,
    }
  if (errorCode(error) === 'P2002') return { status: 409, ...messages[409]!, fieldErrors: {} }
  if (errorCode(error) === 'P2025') return { status: 404, ...messages[404]!, fieldErrors: {} }
  const text = error instanceof Error ? error.message : ''
  if (
    ['Invalid credentials', 'Invalid refresh token', 'Session expired', 'Unauthorized'].includes(
      text,
    )
  )
    return { status: 401, ...messages[401]!, fieldErrors: {} }
  if (text === 'User already exists') return { status: 409, ...messages[409]!, fieldErrors: {} }
  if (text === 'Product not found') return { status: 404, ...messages[404]!, fieldErrors: {} }
  if (text === 'Nova Poshta API request failed')
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Delivery service temporarily unavailable',
      fieldErrors: {},
      retryAfter: 5,
    }
  const status =
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 500
  if (status in messages) return { status, ...messages[status]!, fieldErrors: {} }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error', fieldErrors: {} }
}

export function sendMappedError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  const failure = classifyError(error)
  if (failure.retryAfter && !reply.getHeader('retry-after'))
    reply.header('retry-after', String(failure.retryAfter))
  if (failure.status >= 500)
    request.log.warn({
      code: failure.code,
      route: request.routeOptions.url ?? 'UNMATCHED',
      requestId: request.id,
    })
  const envelope = {
    error: {
      code: failure.code,
      message: failure.message,
      fieldErrors: failure.fieldErrors,
      requestId: request.id,
    },
  }
  return reply
    .code(failure.status)
    .send(request.url.startsWith('/v1/') ? envelope : { message: failure.message, ...envelope })
}
