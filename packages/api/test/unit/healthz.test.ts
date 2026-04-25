import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp } from '../helpers/app.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /healthz', () => {
  it('returns db status and queue and backup field shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { db: string; queue: number; backup_last_verified: string | null }
    expect(['ok', 'error']).toContain(body.db)
    expect(typeof body.queue).toBe('number')
    expect(
      body.backup_last_verified === null || typeof body.backup_last_verified === 'string'
    ).toBe(true)
  })
})
