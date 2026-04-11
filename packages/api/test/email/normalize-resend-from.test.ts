import { describe, it, expect } from 'vitest'
import { normalizeResendFrom, DEFAULT_RESEND_FROM } from '../../src/services/email.service.js'

describe('normalizeResendFrom', () => {
  it('returns default when empty', () => {
    expect(normalizeResendFrom('')).toBe(DEFAULT_RESEND_FROM)
    expect(normalizeResendFrom('   ')).toBe(DEFAULT_RESEND_FROM)
  })

  it('accepts bare email', () => {
    expect(normalizeResendFrom('hello@resend.dev')).toBe('hello@resend.dev')
  })

  it('accepts Name <email>', () => {
    expect(normalizeResendFrom('Mukwano <hello@resend.dev>')).toBe('Mukwano <hello@resend.dev>')
  })

  it('strips outer ASCII and curly quotes', () => {
    expect(normalizeResendFrom('"Mukwano <a@b.com>"')).toBe('Mukwano <a@b.com>')
    expect(normalizeResendFrom('\u201cMukwano <a@b.com>\u201d')).toBe('Mukwano <a@b.com>')
  })

  it('drops empty display name and returns email only', () => {
    expect(normalizeResendFrom('<team@example.com>')).toBe('team@example.com')
  })

  it('falls back when angle form is missing (common misconfiguration)', () => {
    expect(normalizeResendFrom('Mukwano onboarding@resend.dev')).toBe(DEFAULT_RESEND_FROM)
  })

  it('falls back on malformed addresses', () => {
    expect(normalizeResendFrom('not-an-email')).toBe(DEFAULT_RESEND_FROM)
    expect(normalizeResendFrom('Mukwano <incomplete')).toBe(DEFAULT_RESEND_FROM)
  })
})
