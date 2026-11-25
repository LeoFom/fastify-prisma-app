const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { buildApp } = require('../dist/app')
const { prisma } = require('../dist/config/prisma')
const { AuthService } = require('../dist/modules/auth/auth.service')
const { verifyRefresh } = require('../dist/modules/auth/session-tokens')

test('C1.3: unique logins, atomic refresh, grace, replay, logout and canonical email', async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'Only an isolated test database may be used')
  const app = buildApp()
  const suffix = randomUUID()
  const email = `session-${suffix}@example.test`
  const password = 'Synthetic-password-12345'
  const headers = { 'x-coffeo-api-key': process.env.INTERNAL_API_KEY }
  const inject = (method, url, cookie = '', payload) =>
    app.inject({
      method,
      url,
      headers: { ...headers, ...(cookie ? { cookie } : {}) },
      ...(payload ? { payload } : {}),
    })
  let clock = Date.now()
  const service = new AuthService(() => new Date(clock))
  try {
    const registered = await inject('POST', '/auth/register', '', {
      email: `  ${email.toUpperCase()}  `,
      password,
    })
    assert.equal(registered.statusCode, 201, registered.body)
    const userId = registered.json().id
    assert.equal(registered.json().email, email)
    const profile = await prisma.profile.findUnique({ where: { userId } })
    assert.ok(profile, 'Registration must create a profile atomically')
    assert.equal(profile.firstName, null)
    assert.equal(profile.lastName, null)
    const duplicate = await inject('POST', '/auth/register', '', { email, password })
    assert.equal(duplicate.statusCode, 409)

    const [first, second] = await Promise.all([
      service.login({ email, password }),
      service.login({ email, password }),
    ])
    const a = verifyRefresh(first.refreshToken)
    const b = verifyRefresh(second.refreshToken)
    assert.notEqual(a.sid, b.sid)
    assert.notEqual(a.jti, b.jti)
    assert.equal(a.iat, b.iat)
    assert.equal(
      (await inject('GET', '/auth/me', `accessToken=${first.accessToken}`)).statusCode,
      200,
    )
    assert.equal(
      (await inject('GET', '/auth/me', `accessToken=${second.accessToken}`)).statusCode,
      200,
    )

    clock += 11_000
    const [one, two] = await Promise.all([
      service.refresh(first.refreshToken),
      service.refresh(first.refreshToken),
    ])
    assert.equal(one.refreshToken, two.refreshToken, 'Concurrent responses must agree')
    assert.notEqual(one.refreshToken, first.refreshToken)
    const session = await prisma.session.findUnique({ where: { id: a.sid } })
    assert.equal(session.rotationVersion, 1)
    assert.equal(session.expiresAt.getTime(), first.expiresAt.getTime())
    assert.equal(
      (await service.refresh(first.refreshToken)).refreshToken,
      one.refreshToken,
      'Lost response recovers during grace',
    )
    assert.equal(
      (await service.refresh(one.refreshToken)).refreshToken,
      one.refreshToken,
      'Current generation does not rotate again immediately',
    )

    await service.logout(one.refreshToken)
    assert.equal(
      (await inject('GET', '/auth/me', `accessToken=${one.accessToken}`)).statusCode,
      401,
    )
    await assert.rejects(() => service.refresh(first.refreshToken), /Session expired/)
    assert.equal(
      (await inject('GET', '/auth/me', `accessToken=${second.accessToken}`)).statusCode,
      200,
    )

    clock += 11_000
    const rotated = await service.refresh(second.refreshToken)
    clock += 11_000
    await assert.rejects(() => service.refresh(second.refreshToken), /Session expired/)
    const revoked = await prisma.session.findUnique({ where: { id: b.sid } })
    assert.ok(revoked.revokedAt, 'Signed replay outside grace must revoke its session')
    assert.equal(
      (await inject('GET', '/auth/me', `accessToken=${rotated.accessToken}`)).statusCode,
      401,
    )
  } finally {
    await prisma.user.deleteMany({ where: { email } })
    await app.close()
    await prisma.$disconnect()
  }
})
