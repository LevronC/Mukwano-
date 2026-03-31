import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@logout.example'

let app: FastifyInstance

async function signupAndLogin(suffix: string) {
  const email = `${suffix}${DOMAIN}`
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email, password: 'password123', displayName: suffix }
  })
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: 'password123' }
  })
  return res.json() as { accessToken: string; refreshToken: string }
}

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('POST /api/v1/auth/logout (AUTH-04)', () => {
  it('marks the refresh token as revoked', async () => {
    const { accessToken, refreshToken } = await signupAndLogin('logout-user')

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: injectHeaders(accessToken),
      payload: { refreshToken }
    })
    expect(logoutRes.statusCode).toBe(200)

    // Revoked token should now fail on refresh
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken }
    })
    expect(refreshRes.statusCode).toBe(401)
  })

  it('does NOT revoke sibling sessions from other logins (AUTH-04)', async () => {
    // Login from two separate "devices"
    const email = `two-devices${DOMAIN}`
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', displayName: 'Two Devices' }
    })

    const device1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' }
    })
    const device2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' }
    })

    const { accessToken: at1, refreshToken: rt1 } = device1.json()
    const { refreshToken: rt2 } = device2.json()

    // Logout device 1
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: injectHeaders(at1),
      payload: { refreshToken: rt1 }
    })

    // Device 2's refresh token should still work
    const stillValidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt2 }
    })
    expect(stillValidRes.statusCode).toBe(200)
  })

  it('returns 401 without authorization header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken: 'some.token.here' }
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })
})
