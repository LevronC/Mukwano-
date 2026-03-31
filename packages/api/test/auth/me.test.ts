import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@me.example'
const EMAIL = `me-user${DOMAIN}`
const PASSWORD = 'password123'

let app: FastifyInstance
let accessToken: string

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email: EMAIL, password: PASSWORD, displayName: 'Me User' }
  })
  accessToken = res.json().accessToken
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('GET /api/v1/auth/me (AUTH-05)', () => {
  it('returns user profile when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: injectHeaders(accessToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.email).toBe(EMAIL)
    expect(body.displayName).toBe('Me User')
    expect(body.id).toBeTruthy()
    expect(body.passwordHash).toBeUndefined()
  })

  it('returns 401 without authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })
})

describe('PATCH /api/v1/auth/me (AUTH-05)', () => {
  it('updates displayName, country, and sector', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      headers: injectHeaders(accessToken),
      payload: { displayName: 'Updated Name', country: 'UG', sector: 'Tech' }
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.displayName).toBe('Updated Name')
    expect(body.country).toBe('UG')
    expect(body.sector).toBe('Tech')
  })

  it('ignores email and passwordHash (mass assignment protection)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      headers: injectHeaders(accessToken),
      payload: {
        displayName: 'Safe Update',
        email: 'hacked@attacker.com',
        passwordHash: 'injected-hash'
      }
    })

    // Schema has additionalProperties: false so extra fields cause 422
    // OR the service silently ignores them — either is acceptable
    if (res.statusCode === 200) {
      expect(res.json().email).toBe(EMAIL)
    } else {
      expect(res.statusCode).toBe(422)
    }
  })

  it('returns 401 without authorization header', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      payload: { displayName: 'No Auth' }
    })

    expect(res.statusCode).toBe(401)
  })
})
