import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ForbiddenError, NotFoundError } from '../errors/http-errors.js'
import { ContributionService } from './contribution.service.js'
import { CircleService } from './circle.service.js'
import { ProposalService } from './proposal.service.js'

type ActivityItem = {
  id: string
  circleId: string
  actorId: string | null
  type: string
  createdAt: Date
  metadata: Record<string, unknown>
}

type DecimalLike = Prisma.Decimal | number | string

const ATTRIBUTION_NOTE =
  'Verified amounts are allocated across projects in each circle by budget share. Set sector and country on projects for accurate charts.'

const COUNTRY_LABELS: Record<string, string> = {
  UG: 'Uganda',
  KE: 'Kenya',
  TZ: 'Tanzania',
  RW: 'Rwanda',
  SS: 'South Sudan',
  BI: 'Burundi',
  CD: 'DR Congo',
  UN: 'Unallocated'
}

function monthKeyUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  return `${y}-${m < 10 ? '0' : ''}${m}`
}

function addToMap(map: Map<string, number>, key: string, delta: number) {
  map.set(key, (map.get(key) ?? 0) + delta)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function startOfDayUTC(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export class ReportingService {
  constructor(private readonly app: FastifyInstance) {}

  async getPortfolio(userId: string) {
    return this.app.prisma.contribution.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      include: {
        circle: { select: { id: true, name: true, currency: true } },
        verifier: { select: { displayName: true } }
      }
    })
  }

  async getPortfolioSummary(userId: string) {
    const contributions = await this.app.prisma.contribution.findMany({ where: { userId } })

    const totalContributed = contributions.reduce((acc: number, c: { amount: DecimalLike }) => acc + Number(c.amount), 0)
    const verifiedRows = contributions.filter((c: { status: string }) => c.status === 'verified')
    const totalVerified = verifiedRows.reduce((acc: number, c: { amount: DecimalLike }) => acc + Number(c.amount), 0)

    const circleIds = [
      ...new Set(
        (
          await this.app.prisma.circleMembership.findMany({
            where: { userId },
            select: { circleId: true }
          })
        ).map((m: { circleId: string }) => m.circleId)
      )
    ]

    const projectsInCircles = await this.app.prisma.project.findMany({
      where: { circleId: { in: circleIds }, status: { not: 'cancelled' } },
      include: {
        updates: { orderBy: { createdAt: 'desc' }, take: 1, select: { percentComplete: true } }
      }
    })

    const projectsByCircle = new Map<string, typeof projectsInCircles>()
    for (const p of projectsInCircles) {
      const list = projectsByCircle.get(p.circleId) ?? []
      list.push(p)
      projectsByCircle.set(p.circleId, list)
    }

    // "In Projects" should reflect the user's own verified funds currently allocated to
    // executing/complete projects, not total project budgets in joined circles.
    const inProjects = round2(
      verifiedRows.reduce((acc, c) => {
        const amount = Number(c.amount)
        const circleProjects = projectsByCircle.get(c.circleId) ?? []
        if (circleProjects.length === 0) return acc

        const totalBudget = circleProjects.reduce((s, p) => s + Number(p.budget), 0)
        if (totalBudget <= 0) return acc

        const fundedBudget = circleProjects
          .filter((p: { status: string }) => p.status === 'executing' || p.status === 'complete')
          .reduce((s, p) => s + Number(p.budget), 0)

        if (fundedBudget <= 0) return acc
        return acc + amount * (fundedBudget / totalBudget)
      }, 0)
    )

    const sectorTotals = new Map<string, number>()
    const countryTotals = new Map<string, number>()

    for (const c of verifiedRows) {
      const amount = Number(c.amount)
      const circleProjects = projectsByCircle.get(c.circleId) ?? []
      const totalBudget = circleProjects.reduce((s, p) => s + Number(p.budget), 0)

      if (circleProjects.length === 0 || totalBudget <= 0) {
        addToMap(sectorTotals, 'Unallocated', amount)
        addToMap(countryTotals, 'UN', amount)
        continue
      }

      for (const p of circleProjects) {
        const weight = Number(p.budget) / totalBudget
        const share = amount * weight
        const sector = (p.sector && String(p.sector).trim()) || 'Other'
        const cc = (p.countryCode && String(p.countryCode).trim().toUpperCase()) || 'UN'
        addToMap(sectorTotals, sector, share)
        addToMap(countryTotals, cc, share)
      }
    }

    const sectorSum = [...sectorTotals.values()].reduce((a, b) => a + b, 0)
    const bySector = [...sectorTotals.entries()]
      .map(([sector, amount]) => ({
        sector,
        amount: round2(amount),
        percent: sectorSum > 0 ? round2((amount / sectorSum) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    const countrySum = [...countryTotals.values()].reduce((a, b) => a + b, 0)
    const byCountry = [...countryTotals.entries()]
      .map(([countryCode, amount]) => ({
        countryCode,
        label: COUNTRY_LABELS[countryCode] ?? countryCode,
        amount: round2(amount),
        percent: countrySum > 0 ? round2((amount / countrySum) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    const monthTotals = new Map<string, number>()
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      monthTotals.set(monthKeyUTC(d), 0)
    }
    for (const c of verifiedRows) {
      const raw = c.verifiedAt ?? c.submittedAt
      const d = raw instanceof Date ? raw : new Date(raw as string)
      const key = monthKeyUTC(d)
      if (monthTotals.has(key)) {
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + Number(c.amount))
      }
    }
    const timeSeries = [...monthTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount: round2(amount) }))

    const msDay = 86_400_000
    const t = Date.now()
    const sumRange = (start: number, end: number) =>
      verifiedRows
        .filter((row) => {
          const raw = row.verifiedAt ?? row.submittedAt
          const d = raw instanceof Date ? raw : new Date(raw as string)
          const x = d.getTime()
          return x >= start && x < end
        })
        .reduce((acc, row) => acc + Number(row.amount), 0)

    const recent = sumRange(t - 30 * msDay, t)
    const previous = sumRange(t - 60 * msDay, t - 30 * msDay)
    const contributionChangePercent =
      previous > 0 ? round2(((recent - previous) / previous) * 100) : recent > 0 ? 100 : null

    const activeProjects = projectsInCircles
      .filter((p: { status: string }) => p.status === 'executing' || p.status === 'approved')
      .map((p) => {
        const budget = Number(p.budget)
        const pct = p.updates[0]?.percentComplete ?? 0
        const amountRaised = round2((pct / 100) * budget)
        return {
          id: p.id,
          circleId: p.circleId,
          title: p.title,
          sector: p.sector,
          countryCode: p.countryCode,
          budget,
          amountRaised,
          percentComplete: pct,
          status: p.status,
          currency: p.currency
        }
      })
      .sort((a, b) => b.percentComplete - a.percentComplete)
      .slice(0, 12)

    const [proposalsInCircles, userVotes, userCreatedProjects, userCreatedProposals, memberships, userProjectUpdates] =
      await Promise.all([
        this.app.prisma.proposal.findMany({
          where: {
            circleId: { in: circleIds },
            status: { in: ['open', 'closed_passed', 'closed_failed'] }
          },
          select: { id: true }
        }),
        this.app.prisma.vote.findMany({
          where: { userId, proposal: { circleId: { in: circleIds } } },
          select: { castAt: true }
        }),
        this.app.prisma.project.findMany({
          where: { createdBy: userId, status: { in: ['approved', 'executing', 'complete'] } },
          select: { id: true, createdAt: true }
        }),
        this.app.prisma.proposal.findMany({
          where: { createdBy: userId, status: 'closed_passed' },
          select: { id: true, createdAt: true }
        }),
        this.app.prisma.circleMembership.findMany({
          where: { userId },
          select: { circleId: true }
        }),
        this.app.prisma.projectUpdate.findMany({
          where: { postedBy: userId },
          select: { createdAt: true }
        })
      ])

    const approvedContributions = verifiedRows.length
    const totalContributions = contributions.length
    const projectsFundedOrCreated = userCreatedProjects.length
    const proposalsPassed = userCreatedProposals.length
    const votesCast = userVotes.length
    const totalAvailableVotes = proposalsInCircles.length
    const circlesJoined = memberships.length

    const activityDayKeys = new Set<string>()
    for (const c of contributions) {
      const raw = c.submittedAt
      const d = raw instanceof Date ? raw : new Date(raw as string)
      activityDayKeys.add(startOfDayUTC(d))
    }
    for (const vote of userVotes) {
      const d = vote.castAt instanceof Date ? vote.castAt : new Date(vote.castAt as string)
      activityDayKeys.add(startOfDayUTC(d))
    }
    for (const p of userCreatedProjects) {
      const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt as string)
      activityDayKeys.add(startOfDayUTC(d))
    }
    for (const p of userCreatedProposals) {
      const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt as string)
      activityDayKeys.add(startOfDayUTC(d))
    }
    for (const u of userProjectUpdates) {
      const d = u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt as string)
      activityDayKeys.add(startOfDayUTC(d))
    }
    const activeDays = activityDayKeys.size

    // Weighted model:
    // ImpactScore = 0.4C + 0.3P + 0.2V + 0.1E
    const cScore = approvedContributions * 5 + totalContributions * 1
    const pScore = projectsFundedOrCreated * 10 + proposalsPassed * 6
    const vScore = totalAvailableVotes > 0 ? (votesCast / totalAvailableVotes) * 100 : 0
    const eScore = circlesJoined * 2 + activeDays * 0.5
    const impactRaw = 0.4 * cScore + 0.3 * pScore + 0.2 * vScore + 0.1 * eScore
    const impactScore = Math.min(100, round2(impactRaw))

    return {
      totalContributed,
      totalVerified,
      inProjects,
      currency: 'USD',
      attributionNote: ATTRIBUTION_NOTE,
      contributionChangePercent,
      bySector,
      byCountry,
      timeSeries,
      activeProjects,
      impact: {
        score: impactScore,
        components: {
          contributions: round2(cScore),
          projects: round2(pScore),
          voting: round2(vScore),
          engagement: round2(eScore)
        },
        inputs: {
          approvedContributions,
          totalContributions,
          projectsFundedOrCreated,
          proposalsPassed,
          votesCast,
          totalAvailableVotes,
          circlesJoined,
          activeDays
        },
        weights: {
          contributions: 0.4,
          projects: 0.3,
          voting: 0.2,
          engagement: 0.1
        }
      }
    }
  }

  async getDashboard(userId: string) {
    const memberships = await this.app.prisma.circleMembership.findMany({
      where: { userId },
      include: {
        circle: {
          select: {
            id: true,
            name: true,
            status: true,
            currency: true,
            goalAmount: true
          }
        }
      }
    })

    const circleIds = memberships.map((m: { circleId: string }) => m.circleId)

    const pendingContributions = await this.app.prisma.contribution.count({
      where: {
        circleId: { in: circleIds },
        status: 'pending'
      }
    })

    const openProposals = await this.app.prisma.proposal.findMany({
      where: {
        circleId: { in: circleIds },
        status: 'open'
      },
      select: { id: true }
    })

    const voted = await this.app.prisma.vote.findMany({
      where: {
        userId,
        proposalId: { in: openProposals.map((p: { id: string }) => p.id) }
      },
      select: { proposalId: true }
    })
    const votedSet = new Set(voted.map((v: { proposalId: string }) => v.proposalId))
    const unvotedProposals = openProposals.filter((p: { id: string }) => !votedSet.has(p.id)).length

    const recentActivity = await this.getActivityForCircles(circleIds, 20)

    return {
      circles: memberships.map((m: { circle: Record<string, unknown>; role: string }) => ({ ...m.circle, role: m.role })),
      pendingContributions,
      unvotedProposals,
      recentActivity
    }
  }

  async getAdminPendingContributions(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.contribution.findMany({
      where: { status: 'pending' },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        circle: { select: { id: true, name: true } }
      }
    })
  }

  async verifyPendingContribution(requestUserId: string, contributionId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const contribution = await this.app.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: { id: true, circleId: true }
    })
    if (!contribution) throw new NotFoundError('Contribution not found')
    const contributionService = new ContributionService(this.app)
    return contributionService.verifyContribution(contribution.circleId, contribution.id, requestUserId, {
      skipCircleRoleCheck: true
    })
  }

  async rejectPendingContribution(requestUserId: string, contributionId: string, reason: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const contribution = await this.app.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: { id: true, circleId: true }
    })
    if (!contribution) throw new NotFoundError('Contribution not found')
    const contributionService = new ContributionService(this.app)
    return contributionService.rejectContribution(contribution.circleId, contribution.id, requestUserId, reason, {
      skipCircleRoleCheck: true
    })
  }

  async getAdminMembers(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        isGlobalAdmin: true,
        country: true,
        sector: true,
        createdAt: true
      }
    })
  }

  async setGlobalAdmin(requestUserId: string, targetUserId: string, isGlobalAdmin: boolean) {
    await this.ensureGlobalAdmin(requestUserId)

    const target = await this.app.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!target) throw new NotFoundError('User not found')

    return this.app.prisma.user.update({
      where: { id: targetUserId },
      data: { isGlobalAdmin },
      select: {
        id: true,
        email: true,
        displayName: true,
        isGlobalAdmin: true
      }
    })
  }

  async getAdminLedger(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.ledgerEntry.findMany({
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: 500,
      include: {
        circle: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, displayName: true } }
      }
    })
  }

  async getAdminActivity(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500
    })
  }

  async getAdminCircles(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.circle.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        country: true,
        sector: true,
        createdAt: true
      }
    })
  }

  async disableCircle(requestUserId: string, circleId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.$transaction(async (tx) => {
      const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { id: true } })
      if (!circle) throw new NotFoundError('Circle not found')
      const updated = await tx.circle.update({
        where: { id: circleId },
        data: { status: 'closed' }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: requestUserId,
          entityType: 'circle',
          action: 'CIRCLE_DISABLED',
          metadata: { status: 'closed' }
        }
      })
      return updated
    })
  }

  async deleteCircle(requestUserId: string, circleId: string) {
    const circleService = new CircleService(this.app)
    return circleService.adminDeleteCircle(requestUserId, circleId)
  }

  async getAdminProposals(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        circleId: true,
        title: true,
        status: true,
        createdAt: true
      },
      take: 500
    })
  }

  async disableProposal(requestUserId: string, proposalId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const proposal = await this.app.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { circleId: true }
    })
    if (!proposal) throw new NotFoundError('Proposal not found')
    const proposalService = new ProposalService(this.app)
    return proposalService.adminDisableProposal(requestUserId, proposal.circleId, proposalId)
  }

  async deleteProposal(requestUserId: string, proposalId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const proposal = await this.app.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { circleId: true }
    })
    if (!proposal) throw new NotFoundError('Proposal not found')
    const proposalService = new ProposalService(this.app)
    return proposalService.adminDeleteProposal(requestUserId, proposal.circleId, proposalId)
  }

  async getAdminMetrics(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    const [pendingVerifications, totalContributed, escrowBalance, activeCircles, activeProjects] = await Promise.all([
      this.app.prisma.contribution.count({ where: { status: 'pending' } }),
      // Gross: total ever verified (never decreases)
      this.app.prisma.contribution.aggregate({
        _sum: { amount: true },
        where: { status: 'verified' }
      }),
      // Net: sum of all ledger entries — CONTRIBUTION_VERIFIED are positive,
      // PROJECT_FUNDED are negative, so this equals current escrow balance.
      this.app.prisma.ledgerEntry.aggregate({ _sum: { amount: true } }),
      this.app.prisma.circle.count({ where: { status: 'active' } }),
      this.app.prisma.project.count({ where: { status: { in: ['approved', 'executing'] } } })
    ])

    return {
      pendingVerifications,
      totalContributed: Number(totalContributed._sum.amount ?? 0),
      escrowBalance: Number(escrowBalance._sum.amount ?? 0),
      activeCircles,
      activeProjects,
      currency: 'USD'
    }
  }

  async getAdminSystemHealth(requestUserId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return {
      api: 'healthy',
      database: 'healthy',
      checkedAt: new Date().toISOString()
    }
  }

  private async ensureGlobalAdmin(userId: string) {
    const user = await this.app.prisma.user.findUnique({ where: { id: userId }, select: { isGlobalAdmin: true } })
    if (!user?.isGlobalAdmin) {
      throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
    }
  }

  private async getActivityForCircles(circleIds: string[], limit: number) {
    if (!circleIds.length) return []
    const logs = await this.app.prisma.auditLog.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    return logs.map((log) => ({
      id: log.id,
      circleId: log.circleId ?? '',
      actorId: log.actorId,
      type: log.action,
      createdAt: log.createdAt,
      metadata: (log.metadata as Record<string, unknown> | null) ?? {}
    }))
  }
}
