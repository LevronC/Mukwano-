import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { isGlobalPlatformAdmin } from '../lib/platform-role.js'
import { ForbiddenError } from '../errors/http-errors.js'

function monthsAgoUTC(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCMonth(d.getUTCMonth() - n)
  return d
}

export class AnalyticsService {
  constructor(private readonly app: FastifyInstance) {}

  private normalizeMonths(months: number): number {
    if (!Number.isFinite(months)) return 12
    return Math.min(Math.max(Math.trunc(months), 1), 36)
  }

  private async ensureGlobalAdmin(requestUserId: string) {
    const u = await this.app.prisma.user.findUnique({
      where: { id: requestUserId },
      select: { isGlobalAdmin: true, platformRole: true }
    })
    if (!isGlobalPlatformAdmin(u)) throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
  }

  /** New user signups per calendar month (UTC). */
  async userGrowth(requestUserId: string, months = 12) {
    await this.ensureGlobalAdmin(requestUserId)
    const since = monthsAgoUTC(this.normalizeMonths(months))
    const rows = await this.app.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>(
      Prisma.sql`
        SELECT date_trunc('month', "createdAt") AS bucket, COUNT(*)::bigint AS count
        FROM users
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    )
    return {
      series: rows.map((r) => ({
        period: r.bucket.toISOString().slice(0, 7),
        count: Number(r.count)
      }))
    }
  }

  /** Verified contribution totals per month (UTC), based on verifiedAt. */
  async contributionsOverTime(requestUserId: string, months = 12) {
    await this.ensureGlobalAdmin(requestUserId)
    const since = monthsAgoUTC(this.normalizeMonths(months))
    const rows = await this.app.prisma.$queryRaw<Array<{ bucket: Date; total: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT date_trunc('month', COALESCE("verifiedAt", "submittedAt")) AS bucket,
               COALESCE(SUM("amount"), 0)::decimal AS total
        FROM contributions
        WHERE "status" = 'verified'
          AND COALESCE("verifiedAt", "submittedAt") >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    )
    return {
      currency: 'USD',
      series: rows.map((r) => ({
        period: r.bucket.toISOString().slice(0, 7),
        amount: Number(r.total)
      }))
    }
  }

  /** Closed proposals: passed vs failed / other. */
  async proposalSuccessRate(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const grouped = await this.app.prisma.proposal.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { status: { not: 'open' } }
    })
    const map = Object.fromEntries(grouped.map((g) => [g.status, g._count.id]))
    const passed = map.closed_passed ?? 0
    const failed = (map.closed_failed ?? 0) + (map.cancelled ?? 0)
    const decided = passed + failed
    return {
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count.id })),
      passed,
      failed,
      successRatePercent: decided > 0 ? Math.round((passed / decided) * 1000) / 10 : null
    }
  }

  /** Net ledger movement per month (treasury trend). */
  async treasuryTrends(requestUserId: string, months = 12) {
    await this.ensureGlobalAdmin(requestUserId)
    const since = monthsAgoUTC(this.normalizeMonths(months))
    const rows = await this.app.prisma.$queryRaw<Array<{ bucket: Date; net: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT date_trunc('month', "recordedAt") AS bucket,
               SUM("amount")::decimal AS net
        FROM ledger_entries
        WHERE "recordedAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    )
    return {
      currency: 'USD',
      series: rows.map((r) => ({
        period: r.bucket.toISOString().slice(0, 7),
        netAmount: Number(r.net)
      }))
    }
  }
}
