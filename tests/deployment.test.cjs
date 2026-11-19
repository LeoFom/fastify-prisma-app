const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { buildApp } = require('../dist/app')
const { prisma } = require('../dist/config/prisma')

test('deployment flow: health, proxy guard, auth, admin, cart ownership, checkout and logout', async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'Use only an isolated test database')
  const app = buildApp()
  const key = process.env.INTERNAL_API_KEY
  const headers = { 'x-coffeo-api-key': key }
  const suffix = randomUUID()
  const emailA = `deployment-a-${suffix}@example.test`
  const emailB = `deployment-b-${suffix}@example.test`
  const password = 'Synthetic-test-password-123'
  const users = []
  let productId
  const inject = (method, url, cookie = '', payload) =>
    app.inject({ method, url, headers: { ...headers, cookie }, ...(payload ? { payload } : {}) })
  const cookie = (response) => {
    const values = response.headers['set-cookie']
    return (Array.isArray(values) ? values : [values]).filter(Boolean).map(v => String(v).split(';')[0]).join('; ')
  }
  try {
    assert.equal((await app.inject({ url: '/health/live' })).statusCode, 200)
    assert.equal((await app.inject({ url: '/health/ready' })).statusCode, 200)
    assert.equal((await app.inject({ url: '/products' })).statusCode, 401)
    assert.equal((await inject('GET', '/cart')).statusCode, 401)
    for (const email of [emailA, emailB]) {
      const response = await inject('POST', '/auth/register', '', { email, password })
      assert.equal(response.statusCode, 201, response.body)
      const user = response.json()
      users.push(user.id)
      assert.equal(user.passwordHash, undefined)
      assert.equal(user.role, 'Customer')
    }
    const loginA = await inject('POST', '/auth/log-in', '', { email: emailA, password })
    const loginB = await inject('POST', '/auth/log-in', '', { email: emailB, password })
    assert.equal(loginA.statusCode, 200)
    assert.equal(loginB.statusCode, 200)
    const a = cookie(loginA), b = cookie(loginB)
    assert.ok(a.includes('accessToken='))
    assert.ok(a.includes('refreshToken='))
    assert.equal((await inject('GET', '/auth/me', a)).json().email, emailA)
    const product = { name: `Deployment fixture ${suffix}`, category: 'Equipment', price: 10 }
    assert.equal((await inject('POST', '/products', a, product)).statusCode, 403)
    await prisma.user.update({ where: { id: users[0] }, data: { role: 'Admin' } })
    const created = await inject('POST', '/products', a, product)
    assert.equal(created.statusCode, 201, created.body)
    productId = created.json().id
    assert.ok(productId)
    const cart = await inject('POST', '/cart', a, { productId, quantity: 2, priceAtAdding: 0.01 })
    assert.equal(cart.statusCode, 201, cart.body)
    const foreign = await inject('DELETE', '/cart/' + cart.json().id, b)
    assert.ok([403, 404].includes(foreign.statusCode), foreign.body)
    const order = await inject('POST', '/orders', a, {
      contact: { firstName: 'Synthetic', lastName: 'Fixture', phone: '+380000000000', email: emailA },
      delivery: { method: 'courier', address: 'Synthetic test address' },
      payment: { method: 'cash_on_delivery' }, comment: 'Synthetic test only',
    })
    assert.equal(order.statusCode, 201, order.body)
    assert.equal(Number(order.json().totalAmount), 20, 'Checkout must use server product price')
    const forbiddenOrder = await inject('GET', '/orders/' + order.json().id, b)
    assert.ok([403, 404].includes(forbiddenOrder.statusCode), forbiddenOrder.body)
    assert.equal((await inject('GET', '/cart', a)).json().length, 0)
    const out = await inject('POST', '/auth/logout', a)
    assert.equal(out.statusCode, 200, out.body)
    assert.match(cookie(out), /accessToken=/)
    assert.equal((await inject('POST', '/auth/refresh', a)).statusCode, 401)
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } })
    if (productId) await prisma.product.deleteMany({ where: { id: productId } })
    await app.close()
    await prisma.$disconnect()
  }
})
