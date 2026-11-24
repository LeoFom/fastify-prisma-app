const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { buildApp } = require('../dist/app')
const { prisma } = require('../dist/config/prisma')

test('public registration cannot assign administrative or server-owned fields', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test', 'Use only an isolated test database')
  const app = buildApp()
  const suffix = randomUUID()
  const email = `registration-${suffix}@example.test`
  const password = 'Synthetic-test-password-123'
  const attemptedEmails = [email]
  const originalAdminEmail = process.env.ADMIN_EMAIL
  const headers = { 'x-coffeo-api-key': process.env.INTERNAL_API_KEY }
  const inject = (method, url, payload, cookie) => app.inject({
    method, url, headers: { ...headers, ...(cookie ? { cookie } : {}) },
    ...(payload ? { payload } : {}),
  })

  try {
    process.env.ADMIN_EMAIL = email
    await t.test('matching legacy ADMIN_EMAIL still creates a Customer with no admin access', async () => {
      const registered = await inject('POST', '/auth/register', { email, password })
      assert.equal(registered.statusCode, 201)
      assert.equal(registered.json().role, 'Customer')
      assert.equal(registered.json().passwordHash, undefined)
      const saved = await prisma.user.findUnique({ where: { email }, select: { role: true } })
      assert.equal(saved.role, 'Customer', 'Persisted role must match the safe public response')

      const login = await inject('POST', '/auth/log-in', { email, password })
      assert.equal(login.statusCode, 200)
      assert.equal(login.json().user.role, 'Customer')
      const cookie = login.cookies.map(c => `${c.name}=${c.value}`).join('; ')
      const me = await inject('GET', '/auth/me', undefined, cookie)
      assert.equal(me.statusCode, 200)
      assert.equal(me.json().role, 'Customer')
      const mutation = await inject('POST', '/products', {
        name: `Forbidden synthetic product ${suffix}`, category: 'Equipment', price: 10,
      }, cookie)
      assert.equal(mutation.statusCode, 403)
    })

    const forbiddenFields = [
      ['role', 'Admin'],
      ['role', 'Customer'],
      ['userId', randomUUID()],
      ['id', randomUUID()],
      ['passwordHash', 'synthetic-not-a-hash'],
    ]
    for (const [index, [field, value]] of forbiddenFields.entries()) {
      await t.test(`rejects unexpected ${field} field (${index}) before creating an account`, async () => {
        const attemptedEmail = `registration-${suffix}-${index}@example.test`
        attemptedEmails.push(attemptedEmail)
        process.env.ADMIN_EMAIL = attemptedEmail
        const response = await inject('POST', '/auth/register', {
          email: attemptedEmail, password, [field]: value,
        })
        assert.equal(response.statusCode, 400)
        assert.equal(await prisma.user.count({ where: { email: attemptedEmail } }), 0)
      })
    }
  } finally {
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = originalAdminEmail
    try {
      // Exact synthetic addresses only; never reset or clear unrelated test data.
      await prisma.user.deleteMany({ where: { email: { in: attemptedEmails } } })
    } finally {
      await app.close()
      await prisma.$disconnect()
    }
  }
})
