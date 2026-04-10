import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'

type Role = 'member' | 'contributor' | 'creator' | 'admin'
const ADMIN_ROLES: Role[] = ['creator', 'admin']
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const MAX_FILE_BYTES = 10 * 1024 * 1024

export class ContributionService {
  constructor(private readonly app: FastifyInstance) {}

  async submitContribution(circleId: string, userId: string, amount: number, note?: string) {
    await this.ensureMember(circleId, userId)
    if (amount <= 0) throw new ValidationError('Amount must be greater than 0', 'amount')

    return this.app.prisma.contribution.create({
      data: {
        circleId,
        userId,
        amount: new Prisma.Decimal(amount),
        note,
        status: 'pending',
        currency: 'USD'
      }
    })
  }

  async listContributions(circleId: string, userId: string, status?: string) {
    await this.ensureAdmin(circleId, userId)
    return this.app.prisma.contribution.findMany({
      where: {
        circleId,
        ...(status ? { status } : {})
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        proofDocuments: true
      }
    })
  }

  async getContribution(circleId: string, contributionId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    const contribution = await this.app.prisma.contribution.findFirst({
      where: { id: contributionId, circleId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        proofDocuments: true
      }
    })
    if (!contribution) throw new NotFoundError('Contribution not found')
    return contribution
  }

  async verifyContribution(circleId: string, contributionId: string, adminUserId: string, options?: { skipCircleRoleCheck?: boolean }) {
    if (!options?.skipCircleRoleCheck) {
      await this.ensureAdmin(circleId, adminUserId)
    }

    return this.app.prisma.$transaction(async (tx) => {
      const contribution = await tx.contribution.findFirst({
        where: { id: contributionId, circleId }
      })
      if (!contribution) throw new NotFoundError('Contribution not found')
      if (contribution.status !== 'pending') {
        throw new ConflictError('CONTRIBUTION_NOT_PENDING', 'Only pending contributions can be verified')
      }

      const rows = await tx.$queryRaw<Array<{ runningBalance: string }>>`
        SELECT "runningBalance" FROM ledger_entries
        WHERE "circleId" = ${circleId}::uuid
        ORDER BY "recordedAt" DESC, id DESC
        LIMIT 1
        FOR UPDATE`

      const runningBalance = (rows[0]?.runningBalance
        ? new Prisma.Decimal(rows[0].runningBalance)
        : new Prisma.Decimal(0)).add(contribution.amount)

      const ledger = await tx.ledgerEntry.create({
        data: {
          circleId,
          userId: contribution.userId,
          amount: contribution.amount,
          runningBalance,
          currency: 'USD',
          type: 'CONTRIBUTION_VERIFIED',
          referenceContributionId: contribution.id,
          metadata: {
            verifiedBy: adminUserId,
            contributionId: contribution.id
          }
        }
      })

      const updated = await tx.contribution.update({
        where: { id: contribution.id },
        data: {
          status: 'verified',
          verifiedAt: new Date(),
          verifiedBy: adminUserId,
          ledgerEntryId: ledger.id
        }
      })

      await tx.circleMembership.updateMany({
        where: { circleId, userId: contribution.userId, role: 'member' },
        data: { role: 'contributor' }
      })

      await this.app.escrowAdapter.creditContribution({
        circleId,
        contributionId: contribution.id,
        amount: contribution.amount.toString()
      })

      await this.app.notificationAdapter.send('CONTRIBUTION_VERIFIED', {
        circleId,
        contributionId: contribution.id,
        userId: contribution.userId,
        amount: contribution.amount.toString()
      })

      await this.app.notificationService.createForUser(
        contribution.userId,
        'CONTRIBUTION_VERIFIED',
        `Your contribution of ${contribution.amount} ${contribution.currency} was verified`
      )

      return { contribution: updated, ledgerEntry: ledger }
    })
  }

  async rejectContribution(
    circleId: string,
    contributionId: string,
    adminUserId: string,
    reason: string,
    options?: { skipCircleRoleCheck?: boolean }
  ) {
    if (!options?.skipCircleRoleCheck) {
      await this.ensureAdmin(circleId, adminUserId)
    }
    if (!reason.trim()) throw new ValidationError('Rejection reason is required', 'reason')

    const contribution = await this.app.prisma.contribution.findFirst({ where: { id: contributionId, circleId } })
    if (!contribution) throw new NotFoundError('Contribution not found')
    if (contribution.status !== 'pending') {
      throw new ConflictError('CONTRIBUTION_NOT_PENDING', 'Only pending contributions can be rejected')
    }

    return this.app.prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'rejected', rejectionReason: reason }
    })
  }

  async createProofUploadUrl(circleId: string, contributionId: string, userId: string, fileName: string, mimeType: string, sizeBytes: number) {
    const contribution = await this.app.prisma.contribution.findFirst({ where: { id: contributionId, circleId } })
    if (!contribution) throw new NotFoundError('Contribution not found')
    if (contribution.userId != userId) throw new ForbiddenError('PROOF_OWNER_ONLY', 'Only the contribution owner can upload proof')

    if (!ALLOWED_MIME.has(mimeType)) throw new ValidationError('Unsupported MIME type', 'mimeType')
    if (sizeBytes > MAX_FILE_BYTES) throw new ValidationError('File size exceeds 10 MB limit', 'sizeBytes')

    const key = `${circleId}/${contributionId}/${uuidv4()}-${fileName}`
    const upload = await this.app.storageAdapter.createUploadUrl({ fileKey: key, fileName, mimeType, sizeBytes })
    return {
      uploadUrl: upload.uploadUrl,
      fileKey: key,
      expiresInSeconds: upload.expiresInSeconds
    }
  }

  async confirmProofUpload(circleId: string, contributionId: string, userId: string, fileKey: string, fileName: string, mimeType: string, sizeBytes: number) {
    const contribution = await this.app.prisma.contribution.findFirst({ where: { id: contributionId, circleId } })
    if (!contribution) throw new NotFoundError('Contribution not found')
    if (contribution.userId != userId) throw new ForbiddenError('PROOF_OWNER_ONLY', 'Only the contribution owner can upload proof')

    return this.app.prisma.proofDocument.create({
      data: {
        contributionId,
        fileKey,
        fileName,
        mimeType,
        sizeBytes,
        uploadedBy: userId
      }
    })
  }

  async getProofViewUrl(circleId: string, contributionId: string, proofId: string, userId: string) {
    await this.ensureAdmin(circleId, userId)
    const proof = await this.app.prisma.proofDocument.findFirst({
      where: { id: proofId, contributionId, contribution: { circleId } }
    })
    if (!proof) throw new NotFoundError('Proof not found')

    return this.app.storageAdapter.createDownloadUrl({ fileKey: proof.fileKey })
  }

  async listLedger(circleId: string, userId: string, page = 1, pageSize = 20) {
    await this.ensureAdmin(circleId, userId)
    const safePage = Math.max(1, page)
    const safeSize = Math.min(100, Math.max(1, pageSize))
    const skip = (safePage - 1) * safeSize

    const [items, total] = await this.app.prisma.$transaction([
      this.app.prisma.ledgerEntry.findMany({
        where: { circleId },
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: safeSize
      }),
      this.app.prisma.ledgerEntry.count({ where: { circleId } })
    ])

    return {
      page: safePage,
      pageSize: safeSize,
      total,
      items
    }
  }

  async getTreasuryBalance(circleId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    const lastEntry = await this.app.prisma.ledgerEntry.findFirst({
      where: { circleId },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }]
    })

    return {
      circleId,
      balance: lastEntry?.runningBalance ?? new Prisma.Decimal(0),
      currency: 'USD',
      balanceLabel: this.app.demoMode ? 'Treasury balance (simulated)' : 'Treasury balance'
    }
  }

  private async ensureMember(circleId: string, userId: string) {
    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })
    if (!membership) throw new ForbiddenError('NOT_A_MEMBER', 'You must be a member of this circle')
    return membership
  }

  private async ensureAdmin(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (!ADMIN_ROLES.includes(membership.role as Role)) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Admin or creator role required')
    }
    return membership
  }
}
