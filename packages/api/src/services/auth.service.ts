import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { FastifyInstance } from 'fastify'
import type { User } from '@prisma/client'
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError } from '../errors/http-errors.js'

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12

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
      data: { email, passwordHash, displayName }
    })

    return this.issueTokenPair(user)
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
        sector: true,
        avatarUrl: true,
        isGlobalAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async updateMe(userId: string, body: Record<string, unknown>) {
    const allowed = {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      country: typeof body.country === 'string' ? body.country : undefined,
      sector: typeof body.sector === 'string' ? body.sector : undefined
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
        sector: true,
        avatarUrl: true,
        isGlobalAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return user
  }

  private async issueTokenPair(user: User | Pick<User, 'id' | 'email' | 'displayName' | 'isGlobalAdmin'>, existingFamily?: string) {
    const family = existingFamily ?? uuidv4()
    const jti = uuidv4()

    const accessToken = await this.namespacedJwt.access.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      isGlobalAdmin: user.isGlobalAdmin
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
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isGlobalAdmin: user.isGlobalAdmin
      }
    }
  }
}
