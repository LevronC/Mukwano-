import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp } from '../helpers/app.js'

const DOMAIN = '@signup.example'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('POST /api/v1/auth/signup (AUTH-01)', () => {
  it('creates user and returns JWT pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: `alice${DOMAIN}`,
        password: 'password123',
        displayName: 'Alice'
      }
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.user.email).toBe(`alice${DOMAIN}`)
    expect(body.user.displayName).toBe('Alice')
    expect(body.user.isGlobalAdmin).toBe(false)
    expect(body.user.id).toBeTruthy()
    expect(body.user.emailVerified).toBe(false)
    expect(body.user.residenceCountry).toBeNull()
    expect(body.user.sector).toBeNull()
  })

  it('rejects duplicate email with 409', async () => {
    // First signup
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `dup${DOMAIN}`, password: 'password123', displayName: 'Dup' }
    })

    // Second signup with same email
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `dup${DOMAIN}`, password: 'different123', displayName: 'Dup2' }
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('EMAIL_ALREADY_EXISTS')
  })

  it('returns 422 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `missing${DOMAIN}` }
    })

    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 422 when password is below minimum length', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `short${DOMAIN}`, password: 'abc', displayName: 'Short' }
    })

    expect(res.statusCode).toBe(422)
    const body = res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('normalizes email to lowercase', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: `UPPER${DOMAIN}`.toUpperCase(),
        password: 'password123',
        displayName: 'Upper'
      }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().user.email).toBe(`upper${DOMAIN}`)
  })
})
