import { Resend } from 'resend'
import type { FastifyInstance } from 'fastify'
import { HttpError } from '../errors/http-errors.js'

export const DEFAULT_RESEND_FROM = 'Mukwano <onboarding@resend.dev>'

/** Resend accepts `addr@domain` or `Display Name <addr@domain>`. Env values often include stray quotes or omit `< >`. */
export function normalizeResendFrom(raw: string): string {
  let s = stripOuterQuotes((raw ?? '').trim())
  if (!s) return DEFAULT_RESEND_FROM

  const angle = /^(.*?)\s*<([^<>]+@[^<>]+)>\s*$/.exec(s)
  if (angle) {
    const name = stripOuterQuotes(angle[1]).trim()
    const email = angle[2].trim()
    if (!isPlausibleMailbox(email)) return DEFAULT_RESEND_FROM
    if (!name) return email
    return `${name} <${email}>`
  }

  if (isPlausibleMailbox(s)) return s
  return DEFAULT_RESEND_FROM
}

function stripOuterQuotes(s: string): string {
  let t = s
  while (t.length >= 2) {
    const a = t[0]
    const b = t[t.length - 1]
    const paired =
      (a === '"' && b === '"') || (a === "'" && b === "'") || (a === '\u201c' && b === '\u201d')
    if (!paired) break
    t = t.slice(1, -1).trim()
  }
  return t
}

function isPlausibleMailbox(s: string): boolean {
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(s)
}

export class EmailService {
  constructor(private readonly app: FastifyInstance) {}

  private baseUrl(): string {
    return (this.app.config.APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:5173'
  }

  private resendApiKey(): string {
    return (this.app.config.RESEND_API_KEY ?? '').trim()
  }

  private fromAddress(): string {
    return normalizeResendFrom(this.app.config.RESEND_FROM ?? '')
  }

  private async sendWithResend(
    logLabel: 'verification' | 'password_reset',
    payload: { from: string; to: string; subject: string; html: string }
  ): Promise<void> {
    const key = this.resendApiKey()
    if (!key) {
      this.app.log.info(
        { to: payload.to, subject: payload.subject },
        `[email] ${logLabel} skipped (RESEND_API_KEY empty after trim)`
      )
      return
    }

    const resend = new Resend(key)
    type SendResult = { data?: { id?: string } | null; error?: { message?: string } | null }
    let result: SendResult
    try {
      result = (await resend.emails.send(payload)) as SendResult
    } catch (e) {
      this.app.log.error({ err: e, to: payload.to, label: logLabel }, '[email] Resend request threw')
      const msg = e instanceof Error ? e.message : 'Network error calling Resend'
      throw new HttpError(502, 'EMAIL_SEND_FAILED', msg, null)
    }

    if (result.error) {
      this.app.log.error({ err: result.error, to: payload.to, label: logLabel }, '[email] Resend returned error')
      const msg =
        typeof result.error.message === 'string' ? result.error.message : 'Email provider rejected the send'
      throw new HttpError(502, 'EMAIL_SEND_FAILED', msg, null)
    }

    if (result.data?.id) {
      this.app.log.info({ label: logLabel, to: payload.to, resendId: result.data.id }, '[email] sent')
    }
  }

  async sendVerificationEmail(to: string, displayName: string, token: string): Promise<void> {
    const url = `${this.baseUrl()}/verify-email?token=${encodeURIComponent(token)}`
    if (!this.resendApiKey()) {
      this.app.log.info({ to, url }, '[email] verification link (RESEND_API_KEY unset — not sent)')
      return
    }
    await this.sendWithResend('verification', {
      from: this.fromAddress(),
      to: to.trim(),
      subject: 'Verify your Mukwano email',
      html: this.wrapHtml(
        `Hi ${escapeHtml(displayName)},`,
        `<p>Please confirm your email address by clicking the link below:</p>
        <p><a href="${escapeHtml(url)}">Verify email</a></p>
        <p style="color:#666;font-size:14px">If you did not create an account, you can ignore this message.</p>`
      )
    })
  }

  async sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<void> {
    const url = `${this.baseUrl()}/reset-password?token=${encodeURIComponent(token)}`
    if (!this.resendApiKey()) {
      this.app.log.info({ to, url }, '[email] password reset link (RESEND_API_KEY unset — not sent)')
      return
    }
    await this.sendWithResend('password_reset', {
      from: this.fromAddress(),
      to: to.trim(),
      subject: 'Reset your Mukwano password',
      html: this.wrapHtml(
        `Hi ${escapeHtml(displayName)},`,
        `<p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p><a href="${escapeHtml(url)}">Reset password</a></p>
        <p style="color:#666;font-size:14px">This link expires in one hour. If you did not request a reset, ignore this email.</p>`
      )
    })
  }

  private wrapHtml(greeting: string, bodyHtml: string): string {
    return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:24px">
      <p>${greeting}</p>${bodyHtml}
      <p style="margin-top:32px;color:#888;font-size:12px">Mukwano</p>
    </body></html>`
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
