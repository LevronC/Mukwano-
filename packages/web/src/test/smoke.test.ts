import { describe, expect, it } from 'vitest'
import { api } from '@/api/client'

describe('web test setup', () => {
  it('can call config via msw', async () => {
    const config = await api.get<{ demoMode: boolean }>('/config')
    expect(config.demoMode).toBe(true)
  })
})
