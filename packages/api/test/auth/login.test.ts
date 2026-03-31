import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp } from '../helpers/app.js'

const DOMAIN = '@login.example'
const EMAIL = `user${DOMAIN}`
const PASSWORD = 'password123'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  // Seed a user for login tests
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email: EMAIL, password: PASSWORD, displayName: 'Login User' }
  })
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('POST /api/v1/auth/login (AUTH-02, AUTH-07)', () => {
  it('returns accessToken and refreshToken on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: PASSWORD }
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.user.email).toBe(EMAIL)
  })

  it('returns 401 on wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: 'wrongpassword' }
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for non-existent user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: `nobody${DOMAIN}`, password: PASSWORD }
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('access token expires in ~15 minutes (AUTH-02)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: PASSWORD }
    })

    const { accessToken } = res.json()
    // Decode without verify to inspect claims
    const [, payloadB64] = accessToken.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())

    const ttl = payload.exp - payload.iat
    expect(ttl).toBe(900) // 15 minutes = 900 seconds
  })

  it('isGlobalAdmin is false for regular users (AUTH-07)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: PASSWORD }
    })

    expect(res.json().user.isGlobalAdmin).toBe(false)
  })

  it('accepts email regardless of case', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL.toUpperCase(), password: PASSWORD }
    })

    expect(res.statusCode).toBe(200)
  })
})
