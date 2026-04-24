import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@exchange-pair.example'
const EMAIL = `pair${DOMAIN}`
const PASSWORD = 'password123'

let app: FastifyInstance
let accessToken: string

beforeAll(async () => {
  app = await createTestApp()
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email: EMAIL, password: PASSWORD, displayName: 'Pair User' }
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

describe('GET /api/v1/exchange/pair', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/exchange/pair?from=USD&to=UGX' })
    expect(res.statusCode).toBe(401)
  })

  it('returns invalid_pair for disallowed ISO codes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/exchange/pair?from=USD&to=XXX',
      headers: injectHeaders(accessToken)
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('invalid_pair')
  })

  it('returns ok for USD/UGX when currency API is mocked', async () => {
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
      url: '/api/v1/exchange/pair?from=USD&to=UGX',
      headers: injectHeaders(accessToken)
    })
    vi.unstubAllGlobals()

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.fromCurrency).toBe('USD')
    expect(body.toCurrency).toBe('UGX')
    expect(body.rate).toBe(3800)
  })
})
