import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@exchange-dash.example'
const EMAIL = `trader${DOMAIN}`
const PASSWORD = 'password123'

let app: FastifyInstance
let accessToken: string

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email: EMAIL, password: PASSWORD, displayName: 'Exchange User' }
  })
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: EMAIL, password: PASSWORD }
  })
  accessToken = login.json().accessToken as string
})

afterAll(async () => {
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('GET /api/v1/exchange/dashboard', () => {
  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/exchange/dashboard' })
    expect(res.statusCode).toBe(401)
  })

  it('returns incomplete_profile when residence or focus country is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/exchange/dashboard',
      headers: injectHeaders(accessToken)
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('incomplete_profile')
    expect(body.rate).toBeNull()
  })

  it('returns ok with ECB-backed rate after profile is completed (Frankfurter mocked)', async () => {
    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      headers: injectHeaders(accessToken),
      payload: { residenceCountry: 'United States', country: 'Uganda' }
    })
    expect(patch.statusCode).toBe(200)

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input)
        if (u.includes('currency-api') && u.includes('@latest') && u.includes('usd.json')) {
          return new Response(JSON.stringify({ date: '2025-01-15', usd: { ugx: 3800 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (u.includes('currency-api') && u.includes('/v1/currencies/usd.json')) {
          return new Response(JSON.stringify({ date: '2025-01-10', usd: { ugx: 3600 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response('not found', { status: 404 })
      })
    )

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/exchange/dashboard',
      headers: injectHeaders(accessToken)
    })

    vi.unstubAllGlobals()

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.residenceCurrency).toBe('USD')
    expect(body.focusCurrency).toBe('UGX')
    expect(body.rate).toBe(3800)
    expect(Array.isArray(body.series)).toBe(true)
    expect(body.series.length).toBeGreaterThanOrEqual(1)
  })
})
