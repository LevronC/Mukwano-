import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { FastifyInstance } from 'fastify'
import type { User } from '@prisma/client'
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError, HttpError } from '../errors/http-errors.js'

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12
const EMAIL_TOKEN_VERIFY = 'VERIFY'
const EMAIL_TOKEN_RESET = 'RESET'
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  private get namespacedJwt(): { access: { sign: (payload: object) => Promise<string> }; refresh: { sign: (payload: object) => Promise<string>; verify: (token: string) => Promise<unknown>; decode: (token: string) => unknown } } {
    return this.app.jwt as unknown as {
      access: { sign: (payload: object) => Promise<string> }
      refresh: {
        sign: (payload: object) => Promise<string>
        verify: (token: string) => Promise<unknown>
        decode: (token: string) => unknown
      }
    }
  }

  async signup(rawEmail: string, password: string, displayName: string) {
    const email = rawEmail.toLowerCase().trim()

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password')
    }

    const existing = await this.app.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists')

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
    const user = await this.app.prisma.user.create({
      data: { email, passwordHash, displayName, emailVerified: false }
    })

    const verifyToken = crypto.randomBytes(32).toString('hex')
    try {
      await this.app.prisma.emailToken.create({
        data: {
          userId: user.id,
          token: verifyToken,
          type: EMAIL_TOKEN_VERIFY,
          expiresAt: new Date(Date.now() + VERIFY_TTL_MS)
        }
      })
      await this.app.emailService.sendVerificationEmail(user.email, user.displayName, verifyToken)
    } catch (e) {
      await this.app.prisma.emailToken.deleteMany({ where: { userId: user.id } })
      await this.app.prisma.user.delete({ where: { id: user.id } })
      throw e
    }

    const userWithSent = await this.app.prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    return this.issueTokenPair(userWithSent)
  }

  async login(rawEmail: string, password: string) {
    const email = rawEmail.toLowerCase().trim()
    const user = await this.app.prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    return this.issueTokenPair(user)
  }

  async refresh(rawRefreshToken: string) {
    let decoded: { sub: string; jti: string; tokenFamily: string; exp: number } | null
    try {
      decoded = this.namespacedJwt.refresh.decode(rawRefreshToken) as typeof decoded
    } catch {
      throw new UnauthorizedError('INVALID_TOKEN', 'Invalid refresh token')
    }

    if (!decoded?.jti) throw new UnauthorizedError('INVALID_TOKEN', 'Invalid refresh token')

    const tokenRecord = await this.app.prisma.refreshToken.findUnique({
      where: { id: decoded.jti },
      include: { user: true }
    })

    if (!tokenRecord) throw new UnauthorizedError('TOKEN_NOT_FOUND', 'Refresh token not found')

    if (tokenRecord.revokedAt !== null) {
      await this.app.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family, revokedAt: null },
        data: { revokedAt: new Date() }
      })
      throw new UnauthorizedError('TOKEN_REUSE_DETECTED', 'Token reuse detected — all sessions revoked')
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('TOKEN_EXPIRED', 'Refresh token has expired')
    }

    try {
      await this.namespacedJwt.refresh.verify(rawRefreshToken)
    } catch {
      throw new UnauthorizedError('INVALID_TOKEN', 'Invalid refresh token signature')
    }

    await this.app.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() }
    })

    return this.issueTokenPair(tokenRecord.user, tokenRecord.family)
  }

  async logout(rawRefreshToken: string) {
    const decoded = this.namespacedJwt.refresh.decode(rawRefreshToken) as { jti?: string } | null

    if (!decoded?.jti) {
      return
    }

    await this.app.prisma.refreshToken.updateMany({
      where: { id: decoded.jti, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }

  async getMe(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        country: true,
        residenceCountry: true,
        residenceRegion: true,
        sector: true,
        avatarUrl: true,
        isGlobalAdmin: true,
        platformRole: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async verifyEmail(rawToken: string) {
    const token = rawToken.trim()
    if (!token) throw new ValidationError('Token is required', 'token')

    const row = await this.app.prisma.emailToken.findFirst({
      where: {
        token,
        type: EMAIL_TOKEN_VERIFY,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    })
    if (!row) throw new ValidationError('Invalid or expired verification link', 'token')

    await this.app.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() }
      })
      await tx.user.update({
        where: { id: row.userId },
        data: { emailVerified: true }
      })
    })
  }

  async resendVerification(userId: string) {
    const user = await this.app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User not found')
    if (user.emailVerified) {
      throw new ConflictError('ALREADY_VERIFIED', 'Email is already verified')
    }

    const lastSent = user.lastVerificationEmailSent
    if (lastSent && lastSent.getTime() > Date.now() - RESEND_COOLDOWN_MS) {
      throw new HttpError(429, 'RATE_LIMIT', 'Please wait before requesting another verification email')
    }

    const verifyToken = crypto.randomBytes(32).toString('hex')
    const newRow = await this.app.prisma.emailToken.create({
      data: {
        userId: user.id,
        token: verifyToken,
        type: EMAIL_TOKEN_VERIFY,
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS)
      },
      select: { id: true }
    })
    try {
      await this.app.emailService.sendVerificationEmail(user.email, user.displayName, verifyToken)
    } catch (e) {
      await this.app.prisma.emailToken.delete({ where: { id: newRow.id } })
      throw e
    }

    await this.app.prisma.emailToken.updateMany({
      where: { userId, type: EMAIL_TOKEN_VERIFY, usedAt: null, id: { not: newRow.id } },
      data: { usedAt: new Date() }
    })
    await this.app.prisma.user.update({
      where: { id: user.id },
      data: { lastVerificationEmailSent: new Date() }
    })
  }

  async forgotPassword(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim()
    if (!email) return

    const user = await this.app.prisma.user.findUnique({ where: { email } })
    if (!user) return

    await this.app.prisma.emailToken.updateMany({
      where: { userId: user.id, type: EMAIL_TOKEN_RESET, usedAt: null },
      data: { usedAt: new Date() }
    })

    const resetToken = crypto.randomBytes(32).toString('hex')
    try {
      await this.app.prisma.emailToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          type: EMAIL_TOKEN_RESET,
          expiresAt: new Date(Date.now() + RESET_TTL_MS)
        }
      })
      await this.app.emailService.sendPasswordResetEmail(user.email, user.displayName, resetToken)
    } catch (e) {
      await this.app.prisma.emailToken.deleteMany({
        where: { userId: user.id, type: EMAIL_TOKEN_RESET, token: resetToken }
      })
      throw e
    }
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'newPassword')
    }
    const token = rawToken.trim()
    if (!token) throw new ValidationError('Token is required', 'token')

    const row = await this.app.prisma.emailToken.findFirst({
      where: {
        token,
        type: EMAIL_TOKEN_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    })
    if (!row) throw new ValidationError('Invalid or expired reset link', 'token')

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
    await this.app.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() }
      })
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash }
      })
      await tx.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    })
  }

  async countPeersAtResidence(residenceCountry: string, residenceRegion: string | null) {
    if (residenceCountry === 'United States') {
      if (!residenceRegion) return { count: 0 }
      const count = await this.app.prisma.user.count({
        where: { residenceCountry: 'United States', residenceRegion }
      })
      return { count }
    }
    const count = await this.app.prisma.user.count({
      where: { residenceCountry, residenceRegion: null }
    })
    return { count }
  }

  async updateMe(userId: string, body: Record<string, unknown>) {
    const allowed = {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      country: (() => {
        if (!('country' in body)) return undefined
        if (body.country === null) return null
        return typeof body.country === 'string' ? body.country : undefined
      })(),
      residenceCountry: typeof body.residenceCountry === 'string' ? body.residenceCountry : undefined,
      residenceRegion: (() => {
        if (!('residenceRegion' in body)) return undefined
        if (body.residenceRegion === null) return null
        return typeof body.residenceRegion === 'string' ? body.residenceRegion : undefined
      })(),
      sector: typeof body.sector === 'string' ? body.sector : undefined,
      avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined
    }
    const data = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined))

    const user = await this.app.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        country: true,
        residenceCountry: true,
        residenceRegion: true,
        sector: true,
        avatarUrl: true,
        isGlobalAdmin: true,
        platformRole: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return user
  }

  async getMyCircles(userId: string) {
    return this.app.prisma.circleMembership.findMany({
      where: { userId, role: { notIn: ['pending', 'rejected'] } },
      include: { circle: { select: { id: true, name: true, status: true } } },
      orderBy: { joinedAt: 'desc' }
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters', 'newPassword')
    }
    const user = await this.app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User not found')
    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) throw new UnauthorizedError('WRONG_PASSWORD', 'Current password is incorrect')
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
    await this.app.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  }

  async deleteAccount(userId: string) {
    await this.app.prisma.user.delete({ where: { id: userId } })
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGlobalAdmin: user.isGlobalAdmin,
      platformRole: user.platformRole,
      emailVerified: user.emailVerified,
      country: user.country,
      residenceCountry: user.residenceCountry,
      residenceRegion: user.residenceRegion,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    }
  }

  private async issueTokenPair(user: User, existingFamily?: string) {
    const family = existingFamily ?? uuidv4()
    const jti = uuidv4()

    const accessToken = await this.namespacedJwt.access.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      isGlobalAdmin: user.isGlobalAdmin,
      platformRole: user.platformRole,
      emailVerified: user.emailVerified
    })

    const refreshToken = await this.namespacedJwt.refresh.sign({
      sub: user.id,
      tokenFamily: family,
      jti
    })

    await this.app.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, BCRYPT_COST),
        family,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser(user)
    }
  }
}
