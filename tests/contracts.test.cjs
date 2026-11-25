const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { buildApp } = require('../dist/app')
const { prisma } = require('../dist/config/prisma')
const { decimalToMinor } = require('../dist/contracts/v1/mappers')
const {
  mintAccess,
  mintRefresh,
  newSessionIdentity,
  signingKeyId,
} = require('../dist/modules/auth/session-tokens')
const { hashToken } = require('../dist/utils/hash-token')
const {
  apiError,
  productDTO,
  productsResponse,
  profileResponse,
} = require('../dist/contracts/v1/schema')

test('v1 money conversion uses exact decimal text', () => {
  assert.equal(decimalToMinor('0.01'), 1)
  assert.equal(decimalToMinor('13.4'), 1340)
  assert.equal(decimalToMinor('99999999.99'), 9999999999)
  assert.throws(() => decimalToMinor('0.001'))
  assert.throws(() => decimalToMinor('-1.00'))
  assert.throws(() => decimalToMinor('90071992547410.00'))
})

test('v1 rejects malformed requests without database access', async () => {
  const app = buildApp()
  const headers = { 'x-coffeo-api-key': process.env.INTERNAL_API_KEY }
  try {
    await app.ready()
    const unknown = await app.inject({ method: 'GET', url: '/v1/products?role=Admin', headers })
    assert.equal(unknown.statusCode, 400)
    assert.equal(apiError.safeParse(unknown.json()).success, true)
    const unauth = await app.inject({ method: 'GET', url: '/v1/profile/me', headers })
    assert.equal(unauth.statusCode, 401)
    assert.equal(apiError.safeParse(unauth.json()).success, true)
    const invalidJson = await app.inject({
      method: 'PATCH',
      url: '/v1/profile/me',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: '{',
    })
    assert.equal(invalidJson.statusCode, 400)
    assert.equal(apiError.safeParse(invalidJson.json()).success, true)
  } finally {
    await app.close()
  }
})

test('v1 catalog and profile follow schemas; unknown writes fail before persistence', async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'Only an isolated test database may be used')
  const app = buildApp()
  await app.ready()
  const id = randomUUID()
  const userId = randomUUID()
  const hiddenId = randomUUID()
  const key = process.env.INTERNAL_API_KEY
  const identity = newSessionIdentity()
  const token = mintAccess({ id: userId, email: `contract-${userId}@example.test` }, identity.sid)
  const headers = { 'x-coffeo-api-key': key, cookie: `accessToken=${token}` }
  const inject = (method, url, payload, authenticated = true) =>
    app.inject({
      method,
      url,
      headers: authenticated ? headers : { 'x-coffeo-api-key': key },
      ...(payload === undefined ? {} : { payload }),
    })
  try {
    await prisma.user.create({
      data: {
        id: userId,
        email: `contract-${userId}@example.test`,
        passwordHash: 'synthetic-hash',
      },
    })
    const rawRefresh = mintRefresh({
      userId,
      sid: identity.sid,
      jti: identity.jti,
      issuedAt: identity.issuedAt,
      expiresAt: identity.expiresAt,
      keyId: signingKeyId,
    })
    await prisma.session.create({
      data: {
        id: identity.sid,
        userId,
        refreshToken: hashToken(rawRefresh),
        currentJti: identity.jti,
        currentIssuedAt: new Date(identity.issuedAt * 1000),
        expiresAt: new Date(identity.expiresAt * 1000),
        signingKeyId,
      },
    })
    await prisma.product.createMany({
      data: [
        {
          id,
          slug: `contract-${id}`,
          name: 'Contract coffee',
          category: 'Coffee',
          price: '12.34',
          currency: 'USD',
          stockQuantity: 2,
          isActive: true,
        },
        {
          id: hiddenId,
          slug: `contract-${hiddenId}`,
          name: 'Hidden fixture',
          category: 'Coffee',
          price: '2.00',
          currency: 'UAH',
          isActive: false,
        },
      ],
    })
    const catalog = await inject('GET', '/v1/products?pageSize=1', undefined, false)
    assert.equal(catalog.statusCode, 200, catalog.body)
    assert.equal(productsResponse.safeParse(catalog.json()).success, true)
    assert.equal(catalog.json().data.length, 1)
    assert.equal(catalog.json().data[0].priceMinor, 1234)
    assert.equal(
      catalog.json().data[0].currency,
      'USD',
      'Historical currency must not be relabeled',
    )
    assert.equal(catalog.json().data[0].passwordHash, undefined)
    assert.equal(productDTO.safeParse(catalog.json().data[0]).success, true)
    assert.equal(
      (await inject('GET', `/v1/products/${hiddenId}`, undefined, false)).statusCode,
      404,
    )
    assert.equal(
      (await inject('GET', `/products/${id}`, undefined, false)).statusCode,
      200,
      'Legacy read remains usable',
    )

    const before = await inject('GET', '/v1/profile/me')
    assert.equal(before.statusCode, 200)
    assert.equal(profileResponse.safeParse(before.json()).success, true)
    assert.equal(before.json().data, null)
    const unknown = await inject('PATCH', '/v1/profile/me', {
      phone: '+380000000000',
      role: 'Admin',
    })
    assert.equal(unknown.statusCode, 400, unknown.body)
    assert.equal(apiError.safeParse(unknown.json()).success, true)
    assert.equal(await prisma.profile.count({ where: { userId } }), 0)
    const created = await inject('PATCH', '/v1/profile/me', { phone: '+380000000000' })
    assert.equal(created.statusCode, 200, created.body)
    assert.equal(created.json().data.phone, '+380000000000')
    const omitted = await inject('PATCH', '/v1/profile/me', { firstName: 'Synthetic' })
    assert.equal(omitted.json().data.phone, '+380000000000')
    const cleared = await inject('PATCH', '/v1/profile/me', { phone: null })
    assert.equal(cleared.json().data.phone, null)

    const fakePrice = await inject('POST', '/v1/cart/items', {
      productId: id,
      quantity: 1,
      expectedRevision: 0,
      priceMinor: 1,
    })
    assert.equal(fakePrice.statusCode, 400)
    assert.equal(apiError.safeParse(fakePrice.json()).success, true)
    const reserved = await inject('POST', '/v1/cart/items', {
      productId: id,
      quantity: 1,
      expectedRevision: 0,
    })
    assert.equal(reserved.statusCode, 501)
    assert.equal(reserved.json().error.code, 'FEATURE_NOT_AVAILABLE')
    assert.equal(await prisma.cartItem.count({ where: { userId } }), 0)
    const unauth = await inject('GET', '/v1/profile/me', undefined, false)
    assert.equal(unauth.statusCode, 401)
    assert.equal(apiError.safeParse(unauth.json()).success, true)
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.product.deleteMany({ where: { id: { in: [id, hiddenId] } } })
    await app.close()
    await prisma.$disconnect()
  }
})
