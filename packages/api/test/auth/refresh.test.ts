import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp } from '../helpers/app.js'

const DOMAIN = '@refresh.example'

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

describe('POST /api/v1/auth/refresh (AUTH-03)', () => {
  it('returns a new token pair on valid refresh', async () => {
    const { refreshToken } = await signupAndLogin('refresh-user')

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken }
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.refreshToken).not.toBe(refreshToken)
  })

  it('invalidates old refresh token after use (rotation)', async () => {
    const { refreshToken: rt1 } = await signupAndLogin('rotate-user')

    // Use rt1 to get rt2
    const rotateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt1 }
    })
    expect(rotateRes.statusCode).toBe(200)

    // rt1 should now be rejected
    const reusedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt1 }
    })
    expect(reusedRes.statusCode).toBe(401)
  })

  it('rejects an invalid/malformed refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'not.a.valid.token' }
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('Refresh token reuse detection (AUTH-06)', () => {
  it('revoking used token also revokes all siblings in the family', async () => {
    const { refreshToken: rt1 } = await signupAndLogin('reuse-user')

    // Rotate: rt1 → rt2
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt1 }
    })
    const { refreshToken: rt2 } = res1.json()

    // Rotate: rt2 → rt3
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt2 }
    })
    expect(res2.statusCode).toBe(200)
    const { refreshToken: rt3 } = res2.json()

    // REUSE: present rt1 (already revoked) — triggers family revocation
    const reuseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt1 }
    })
    expect(reuseRes.statusCode).toBe(401)
    expect(reuseRes.json().error.code).toBe('TOKEN_REUSE_DETECTED')

    // rt3 (sibling in the same family) must also be revoked now
    const siblingRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rt3 }
    })
    expect(siblingRes.statusCode).toBe(401)
  })
})
