const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { buildApp } = require('../dist/app')
const {
  mintAccess,
  mintRefresh,
  newSessionIdentity,
  signingKeyId,
} = require('../dist/modules/auth/session-tokens')
const { readRuntimeEnv } = require('../dist/config/runtime-env')
const { classifyError } = require('../dist/shared/http/errors')
const { AuthRepository } = require('../dist/modules/auth/auth.repository')

const outage = () =>
  Object.assign(new Error('synthetic secret must never be returned'), { code: 'P1001' })

test('startup validates URL/secrets without printing their values', () => {
  const valid = {
    NODE_ENV: 'production',
    PORT: '3001',
    DATABASE_URL: 'postgresql://synthetic:secret@db.example.test:5432/coffeo',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    COOKIE_SECRET: 'c'.repeat(32),
    INTERNAL_API_KEY: 'server-only',
  }
  assert.equal(readRuntimeEnv(valid).PORT, 3001)
  assert.throws(
    () => readRuntimeEnv({ ...valid, DATABASE_URL: 'not-a-postgres-url' }),
    (error) => error.message.includes('DATABASE_URL') && !error.message.includes('secret'),
  )
  assert.throws(() => readRuntimeEnv({ ...valid, INTERNAL_API_KEY: undefined }), /INTERNAL_API_KEY/)
  assert.throws(() => readRuntimeEnv({ ...valid, JWT_ACCESS_SECRET: 'short' }), /JWT_ACCESS_SECRET/)
})

test('domain and infrastructure errors have distinct safe codes', () => {
  assert.equal(classifyError(new Error('Invalid credentials')).status, 401)
  assert.equal(classifyError(outage()).status, 503)
  assert.equal(classifyError(outage()).code, 'SERVICE_UNAVAILABLE')
  assert.equal(classifyError(Object.assign(new Error('unique'), { code: 'P2002' })).status, 409)
  assert.equal(classifyError(Object.assign(new Error('missing'), { code: 'P2025' })).status, 404)
  assert.equal(
    classifyError(new Error('synthetic secret must never be returned')).message,
    'Internal server error',
  )
})

test('database outage during auth returns 503 without clearing cookies', async (t) => {
  const app = buildApp()
  await app.ready()
  const userId = randomUUID()
  const identity = newSessionIdentity()
  const access = mintAccess({ id: userId, email: 'synthetic@example.test' }, identity.sid)
  const refresh = mintRefresh({
    userId,
    sid: identity.sid,
    jti: identity.jti,
    issuedAt: identity.issuedAt,
    expiresAt: identity.expiresAt,
    keyId: signingKeyId,
  })
  const key = process.env.INTERNAL_API_KEY
  const headers = { 'x-coffeo-api-key': key }
  const inject = (method, url, cookie, payload, extra = {}) =>
    app.inject({
      method,
      url,
      headers: { ...headers, ...(cookie ? { cookie } : {}), ...extra },
      ...(payload ? { payload } : {}),
    })
  try {
    const denied = await app.inject({ method: 'GET', url: '/products' })
    assert.equal(denied.statusCode, 401)
    assert.equal(denied.json().error.code, 'UNAUTHORIZED')

    t.mock.method(AuthRepository.prototype, 'findSessionById', async () => {
      throw outage()
    })
    const me = await inject('GET', '/auth/me', `accessToken=${access}`)
    assert.equal(me.statusCode, 503, me.body)
    assert.equal(me.json().error.code, 'SERVICE_UNAVAILABLE')
    assert.equal(me.json().message, 'Service temporarily unavailable')
    assert.equal(me.headers['retry-after'], '5')
    assert.equal(me.headers['set-cookie'], undefined)
    assert.doesNotMatch(me.body, /synthetic secret/)

    t.mock.method(AuthRepository.prototype, 'withLockedSession', async () => {
      throw outage()
    })
    const recovered = await inject('GET', '/cart', `refreshToken=${refresh}`)
    assert.equal(recovered.statusCode, 401, recovered.body)
    assert.equal(recovered.json().error.code, 'ACCESS_EXPIRED')
    assert.equal(recovered.headers['set-cookie'], undefined)
    const rotated = await inject('POST', '/auth/refresh', `refreshToken=${refresh}`)
    assert.equal(rotated.statusCode, 503, rotated.body)
    assert.equal(rotated.headers['set-cookie'], undefined)

    t.mock.method(AuthRepository.prototype, 'revokeSession', async () => {
      throw outage()
    })
    const logout = await inject('POST', '/auth/logout', `refreshToken=${refresh}`)
    assert.equal(logout.statusCode, 503, logout.body)
    assert.equal(logout.headers['set-cookie'], undefined)

    t.mock.method(AuthRepository.prototype, 'findByEmail', async () => {
      throw outage()
    })
    const login = await inject('POST', '/auth/log-in', '', {
      email: 'synthetic@example.test',
      password: 'synthetic-password',
    })
    assert.equal(login.statusCode, 503, login.body)
    assert.equal(login.headers['set-cookie'], undefined)

    const invalid = await inject('POST', '/auth/refresh', 'refreshToken=invalid')
    assert.equal(invalid.statusCode, 401)
    assert.ok(invalid.headers['set-cookie'])

    const correlation = await inject('GET', '/v1/products?unknown=1', '', undefined, {
      'x-request-id': 'contract-request-123',
    })
    assert.equal(correlation.statusCode, 400)
    assert.equal(correlation.headers['x-request-id'], 'contract-request-123')
    assert.equal(correlation.json().error.requestId, 'contract-request-123')
    const rejected = await inject('GET', '/v1/products?unknown=1', '', undefined, {
      'x-request-id': 'private@example.test',
    })
    assert.notEqual(rejected.headers['x-request-id'], 'private@example.test')
  } finally {
    t.mock.restoreAll()
    await app.close()
  }
})
