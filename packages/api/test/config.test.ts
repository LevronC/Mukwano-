import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp } from './helpers/app.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  await app.close()
})

describe('GET /api/v1/config (DEMO-01)', () => {
  it('returns demoMode, currency, and escrowLabel', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/config'
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.demoMode).toBe('boolean')
    expect(typeof body.currency).toBe('string')
    expect(typeof body.escrowLabel).toBe('string')
    expect(body.currency).toBe('USD')
  })

  it('is a public endpoint — no auth required', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/config'
      // No Authorization header
    })

    expect(res.statusCode).toBe(200)
  })

  it('escrowLabel reflects demoMode correctly', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/config' })
    const { demoMode, escrowLabel } = res.json()

    if (demoMode) {
      // When DEMO_MODE=true, label should signal simulation
      expect(escrowLabel.toLowerCase()).toContain('simulated')
    } else {
      expect(escrowLabel.toLowerCase()).toContain('live')
    }
  })
})
