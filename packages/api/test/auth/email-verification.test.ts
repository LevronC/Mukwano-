import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@emailverify.example'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('POST /api/v1/auth/verify-email', () => {
  it('verifies email with valid token', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `verify-ok${DOMAIN}`, password: 'password123', displayName: 'V' }
    })
    expect(signup.statusCode).toBe(201)
    const userId = signup.json().user.id as string
    const tokenRow = await app.prisma.emailToken.findFirst({
      where: { userId, type: 'VERIFY', usedAt: null }
    })
    expect(tokenRow?.token).toBeTruthy()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token: tokenRow!.token }
    })
    expect(res.statusCode).toBe(204)

    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    expect(user?.emailVerified).toBe(true)
  })

  it('returns 422 for invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token: 'not-a-real-token-at-all-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('POST /api/v1/auth/resend-verification', () => {
  it('returns 429 when called twice within cooldown', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `resend-cd${DOMAIN}`, password: 'password123', displayName: 'R' }
    })
    const access = signup.json().accessToken as string

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/resend-verification',
      headers: injectHeaders(access)
    })
    expect(first.statusCode).toBe(204)

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/resend-verification',
      headers: injectHeaders(access)
    })
    expect(second.statusCode).toBe(429)
  })
})

describe('POST /api/v1/auth/forgot-password + reset-password', () => {
  it('allows reset with valid token', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `reset-flow${DOMAIN}`, password: 'password123', displayName: 'RF' }
    })

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: `reset-flow${DOMAIN}` }
    })

    const user = await app.prisma.user.findUnique({ where: { email: `reset-flow${DOMAIN}` } })
    const tokenRow = await app.prisma.emailToken.findFirst({
      where: { userId: user!.id, type: 'RESET', usedAt: null }
    })
    expect(tokenRow?.token).toBeTruthy()

    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: tokenRow!.token, newPassword: 'newpass999' }
    })
    expect(reset.statusCode).toBe(204)

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: `reset-flow${DOMAIN}`, password: 'newpass999' }
    })
    expect(login.statusCode).toBe(200)
  })

  it('returns 204 for forgot-password on unknown email (no enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: `nobody-here${DOMAIN}` }
    })
    expect(res.statusCode).toBe(204)
  })
})
