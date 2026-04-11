import { Resend } from 'resend'
import type { FastifyInstance } from 'fastify'

export class EmailService {
  constructor(private readonly app: FastifyInstance) {}

  private baseUrl(): string {
    return this.app.config.APP_URL.replace(/\/+$/, '')
  }

  async sendVerificationEmail(to: string, displayName: string, token: string): Promise<void> {
    const url = `${this.baseUrl()}/verify-email?token=${encodeURIComponent(token)}`
    const key = this.app.config.RESEND_API_KEY
    if (!key) {
      this.app.log.info({ to, url }, '[email] verification link (RESEND_API_KEY unset — not sent)')
      return
    }
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: this.app.config.RESEND_FROM,
      to,
      subject: 'Verify your Mukwano email',
      html: this.wrapHtml(
        `Hi ${escapeHtml(displayName)},`,
        `<p>Please confirm your email address by clicking the link below:</p>
        <p><a href="${escapeHtml(url)}">Verify email</a></p>
        <p style="color:#666;font-size:14px">If you did not create an account, you can ignore this message.</p>`
      )
    })
    if (error) {
      this.app.log.error({ err: error, to }, 'Resend verification email failed')
    }
  }

  async sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<void> {
    const url = `${this.baseUrl()}/reset-password?token=${encodeURIComponent(token)}`
    const key = this.app.config.RESEND_API_KEY
    if (!key) {
      this.app.log.info({ to, url }, '[email] password reset link (RESEND_API_KEY unset — not sent)')
      return
    }
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: this.app.config.RESEND_FROM,
      to,
      subject: 'Reset your Mukwano password',
      html: this.wrapHtml(
        `Hi ${escapeHtml(displayName)},`,
        `<p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p><a href="${escapeHtml(url)}">Reset password</a></p>
        <p style="color:#666;font-size:14px">This link expires in one hour. If you did not request a reset, ignore this email.</p>`
      )
    })
    if (error) {
      this.app.log.error({ err: error, to }, 'Resend password reset email failed')
    }
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
