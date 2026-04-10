import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ForbiddenError, NotFoundError } from '../errors/http-errors.js'
import { ContributionService } from './contribution.service.js'

type ActivityItem = {
  id: string
  circleId: string
  actorId: string | null
  type: string
  createdAt: Date
  metadata: Record<string, unknown>
}

type DecimalLike = Prisma.Decimal | number | string

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
    const totalVerified = contributions
      .filter((c: { status: string }) => c.status === 'verified')
      .reduce((acc: number, c: { amount: DecimalLike }) => acc + Number(c.amount), 0)

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

    const projects = await this.app.prisma.project.findMany({
      where: {
        circleId: { in: circleIds },
        status: { in: ['executing', 'complete'] }
      }
    })

    const inProjects = projects.reduce((acc: number, p: { budget: DecimalLike }) => acc + Number(p.budget), 0)

    return {
      totalContributed,
      totalVerified,
      inProjects,
      currency: 'USD'
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
    const circles = await this.app.prisma.circle.findMany({ select: { id: true } })
    return this.getActivityForCircles(circles.map((c: { id: string }) => c.id), 500)
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

    const [contributions, proposals, votes, projects, updates] = await Promise.all([
      this.app.prisma.contribution.findMany({
        where: { circleId: { in: circleIds } },
        orderBy: { submittedAt: 'desc' },
        take: limit,
        select: {
          id: true, circleId: true, userId: true, status: true, submittedAt: true, verifiedAt: true, verifiedBy: true
        }
      }),
      this.app.prisma.proposal.findMany({
        where: { circleId: { in: circleIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, circleId: true, createdBy: true, status: true, createdAt: true, closedAt: true, cancelledAt: true }
      }),
      this.app.prisma.vote.findMany({
        where: { proposal: { circleId: { in: circleIds } } },
        orderBy: { castAt: 'desc' },
        take: limit,
        select: { id: true, userId: true, vote: true, castAt: true, proposal: { select: { id: true, circleId: true } } }
      }),
      this.app.prisma.project.findMany({
        where: { circleId: { in: circleIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, circleId: true, createdBy: true, status: true, createdAt: true, completedAt: true }
      }),
      this.app.prisma.projectUpdate.findMany({
        where: { project: { circleId: { in: circleIds } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, postedBy: true, content: true, percentComplete: true, createdAt: true, project: { select: { id: true, circleId: true } } }
      })
    ])

    const activity: ActivityItem[] = []

    for (const c of contributions) {
      activity.push({
        id: `contrib-${c.id}`,
        circleId: c.circleId,
        actorId: c.userId,
        type: 'CONTRIBUTION_SUBMITTED',
        createdAt: c.submittedAt,
        metadata: { contributionId: c.id, status: c.status }
      })
      if (c.verifiedAt && c.verifiedBy) {
        activity.push({
          id: `contrib-verified-${c.id}`,
          circleId: c.circleId,
          actorId: c.verifiedBy,
          type: 'CONTRIBUTION_VERIFIED',
          createdAt: c.verifiedAt,
          metadata: { contributionId: c.id }
        })
      }
    }

    for (const p of proposals) {
      activity.push({
        id: `proposal-${p.id}`,
        circleId: p.circleId,
        actorId: p.createdBy,
        type: 'PROPOSAL_CREATED',
        createdAt: p.createdAt,
        metadata: { proposalId: p.id, status: p.status }
      })
      if (p.closedAt) {
        activity.push({
          id: `proposal-closed-${p.id}`,
          circleId: p.circleId,
          actorId: p.createdBy,
          type: p.status === 'closed_passed' ? 'PROPOSAL_CLOSED_PASSED' : 'PROPOSAL_CLOSED_FAILED',
          createdAt: p.closedAt,
          metadata: { proposalId: p.id }
        })
      }
      if (p.cancelledAt) {
        activity.push({
          id: `proposal-cancelled-${p.id}`,
          circleId: p.circleId,
          actorId: p.createdBy,
          type: 'PROPOSAL_CANCELLED',
          createdAt: p.cancelledAt,
          metadata: { proposalId: p.id }
        })
      }
    }

    for (const v of votes) {
      activity.push({
        id: `vote-${v.id}`,
        circleId: v.proposal.circleId,
        actorId: v.userId,
        type: 'VOTE_CAST',
        createdAt: v.castAt,
        metadata: { proposalId: v.proposal.id, vote: v.vote }
      })
    }

    for (const p of projects) {
      activity.push({
        id: `project-${p.id}`,
        circleId: p.circleId,
        actorId: p.createdBy,
        type: 'PROJECT_CREATED',
        createdAt: p.createdAt,
        metadata: { projectId: p.id, status: p.status }
      })
      if (p.completedAt) {
        activity.push({
          id: `project-complete-${p.id}`,
          circleId: p.circleId,
          actorId: p.createdBy,
          type: 'PROJECT_COMPLETE',
          createdAt: p.completedAt,
          metadata: { projectId: p.id }
        })
      }
    }

    for (const u of updates) {
      activity.push({
        id: `project-update-${u.id}`,
        circleId: u.project.circleId,
        actorId: u.postedBy,
        type: 'PROJECT_UPDATE_POSTED',
        createdAt: u.createdAt,
        metadata: { projectId: u.project.id, percentComplete: u.percentComplete, content: u.content }
      })
    }

    return activity
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }
}
