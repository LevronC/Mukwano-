import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ConflictError, ForbiddenError, HttpError, NotFoundError, ValidationError } from '../errors/http-errors.js'
import { captureFinancialException } from '../lib/observability/sentry.js'
import { assertActiveMembership } from '../lib/membership.js'

type Role = 'member' | 'contributor' | 'creator' | 'admin'
const ADMIN_ROLES: Role[] = ['creator', 'admin']

export class ProjectService {
  constructor(private readonly app: FastifyInstance) {}

  async createFromPassedProposal(circleId: string, userId: string, proposalId: string) {
    await this.ensureAdmin(circleId, userId)

    const proposal = await this.app.prisma.proposal.findFirst({ where: { id: proposalId, circleId } })
    if (!proposal) throw new NotFoundError('Proposal not found')
    if (proposal.status !== 'closed_passed') {
      throw new ValidationError('Project can only be created from closed_passed proposal')
    }

    const existing = await this.app.prisma.project.findFirst({ where: { proposalId, circleId } })
    if (existing) throw new ConflictError('PROJECT_ALREADY_EXISTS', 'Project already created for this proposal')

    return this.app.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          circleId,
          proposalId,
          createdBy: userId,
          title: proposal.title,
          description: proposal.description,
          budget: proposal.requestedAmount,
          currency: proposal.currency,
          status: 'approved'
        }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'project',
          action: 'PROJECT_CREATED',
          metadata: { projectId: project.id, proposalId }
        }
      })
      return project
    })
  }

  async listProjects(circleId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    return this.app.prisma.project.findMany({
      where: { circleId },
      orderBy: { createdAt: 'desc' },
      include: { updates: true }
    })
  }

  async getProject(circleId: string, projectId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    const project = await this.app.prisma.project.findFirst({
      where: { id: projectId, circleId },
      include: { updates: { orderBy: { createdAt: 'desc' } } }
    })
    if (!project) throw new NotFoundError('Project not found')
    return project
  }

  async updateProjectMetadata(
    circleId: string,
    projectId: string,
    userId: string,
    data: { sector?: string | null; countryCode?: string | null }
  ) {
    await this.ensureAdmin(circleId, userId)

    const project = await this.app.prisma.project.findFirst({ where: { id: projectId, circleId } })
    if (!project) throw new NotFoundError('Project not found')

    const patch: { sector?: string | null; countryCode?: string | null } = {}
    if (data.sector !== undefined) {
      patch.sector = data.sector?.trim() || null
    }
    if (data.countryCode !== undefined) {
      if (data.countryCode === null || data.countryCode === '') {
        patch.countryCode = null
      } else {
        const cc = data.countryCode.trim().toUpperCase()
        if (cc.length !== 2) {
          throw new ValidationError('countryCode must be a 2-letter ISO code')
        }
        patch.countryCode = cc
      }
    }

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: project.id },
        data: patch
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'project',
          action: 'PROJECT_METADATA_UPDATED',
          metadata: { projectId: project.id, ...patch }
        }
      })
      return updated
    })
  }

  async transitionStatus(circleId: string, projectId: string, userId: string, status: 'approved'|'executing'|'complete'|'cancelled') {
    await this.ensureAdmin(circleId, userId)

    const result = await this.app.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, circleId } })
      if (!project) throw new NotFoundError('Project not found')

      if (status === 'executing' && project.status !== 'approved') {
        throw new ConflictError('INVALID_PROJECT_TRANSITION', 'Project can only move to executing from approved')
      }
      if (status === 'complete' && project.status !== 'executing') {
        throw new ConflictError('INVALID_PROJECT_TRANSITION', 'Project can only move to complete from executing')
      }

      if (status === 'executing') {
        const lastLedger = await tx.ledgerEntry.findFirst({
          where: { circleId },
          orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }]
        })
        const balance = lastLedger?.runningBalance ?? new Prisma.Decimal(0)
        if (balance.lessThan(project.budget)) {
          throw new HttpError(422, 'INSUFFICIENT_TREASURY', 'Insufficient treasury for project budget')
        }

        const runningBalance = balance.sub(project.budget)
        await tx.ledgerEntry.create({
          data: {
            circleId,
            userId,
            amount: project.budget.neg(),
            runningBalance,
            currency: project.currency,
            type: 'PROJECT_FUNDED',
            metadata: { projectId: project.id, proposalId: project.proposalId }
          }
        })

        await this.app.escrowAdapter.debitProjectFunding({
          circleId,
          projectId: project.id,
          amount: project.budget.toString()
        })
      }

      const updated = await tx.project.update({
        where: { id: project.id },
        data: {
          status,
          completedAt: status === 'complete' ? new Date() : null
        }
      })

      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'project',
          action: 'PROJECT_STATUS_CHANGED',
          metadata: { projectId: project.id, status }
        }
      })

      return { updated, project }
    })

    // Fire side-effects AFTER the transaction commits so a failure here
    // cannot mask the successfully committed status transition to the caller.
    await this.app.notificationAdapter.send('PROJECT_STATUS_CHANGED', {
      circleId,
      projectId: result.project.id,
      status
    })

    this.app.notificationService
      .createForCircle(
        circleId,
        'PROJECT_STATUS_CHANGED',
        `Project "${result.project.title}" moved to ${status}`
      )
      .catch((err) => {
        this.app.log.error({ err }, 'notification.createForCircle failed silently')
        captureFinancialException(err, 'notification.project_status', { projectId: result.project.id, status })
      })

    return result.updated
  }

  async postUpdate(circleId: string, projectId: string, userId: string, content: string, percentComplete?: number) {
    const membership = await this.ensureMember(circleId, userId)
    if (!ADMIN_ROLES.includes(membership.role as Role)) {
      const project = await this.app.prisma.project.findFirst({ where: { id: projectId, circleId } })
      if (!project) throw new NotFoundError('Project not found')
      if (project.createdBy !== userId) {
        throw new ForbiddenError('INSUFFICIENT_ROLE', 'Only admin or creator can post updates')
      }
    }

    const project = await this.app.prisma.project.findFirst({ where: { id: projectId, circleId } })
    if (!project) throw new NotFoundError('Project not found')
    if (project.status !== 'executing') {
      throw new ConflictError('PROJECT_NOT_EXECUTING', 'Updates can only be posted for executing projects')
    }

    return this.app.prisma.$transaction(async (tx) => {
      const update = await tx.projectUpdate.create({
        data: {
          projectId,
          postedBy: userId,
          content,
          percentComplete: percentComplete ?? 0
        }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'project',
          action: 'PROJECT_UPDATE_POSTED',
          metadata: { projectId, percentComplete: percentComplete ?? 0 }
        }
      })
      return update
    })
  }

  async listUpdates(circleId: string, projectId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    const project = await this.app.prisma.project.findFirst({ where: { id: projectId, circleId }, select: { id: true } })
    if (!project) throw new NotFoundError('Project not found')

    return this.app.prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  }

  private async ensureMember(circleId: string, userId: string) {
    return assertActiveMembership(this.app.prisma, circleId, userId)
  }

  private async ensureAdmin(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (!ADMIN_ROLES.includes(membership.role as Role)) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Admin or creator role required')
    }
    return membership
  }
}
