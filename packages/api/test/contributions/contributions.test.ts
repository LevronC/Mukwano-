import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders, signupWithVerifiedEmail } from '../helpers/app.js'

const DOMAIN = '@contrib.example'

let app: FastifyInstance
let creatorToken: string
let memberToken: string
let outsiderToken: string
let circleId: string
let contributionId: string
let memberId: string

async function signup(suffix: string): Promise<{ accessToken: string; userId: string }> {
  return signupWithVerifiedEmail(app, `${suffix}${DOMAIN}`, 'password123', suffix)
}

beforeAll(async () => {
  app = await createTestApp()

  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })

  const creator = await signup('creator')
  const member = await signup('member')
  const outsider = await signup('outsider')

  creatorToken = creator.accessToken
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken
  memberId = member.userId

  const circleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(creatorToken),
    payload: { name: 'Contribution Circle', goalAmount: 10000 }
  })
  circleId = circleRes.json().id

  await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/join`,
    headers: injectHeaders(memberToken)
  })
})

afterAll(async () => {
  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('Phase 3 - contributions and ledger', () => {
  it('CONTRIB-01/02: member can submit pending contribution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken),
      payload: { amount: 250, note: 'first contribution' }
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.status).toBe('pending')
    contributionId = body.id

    const treasury = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/treasury`,
      headers: injectHeaders(memberToken)
    })
    expect(treasury.statusCode).toBe(200)
    expect(Number(treasury.json().balance)).toBe(0)
    expect(typeof treasury.json().balanceLabel).toBe('string')
    if (app.demoMode) {
      expect(treasury.json().balanceLabel.toLowerCase()).toContain('simulated')
    }
  })

  it('CONTRIB-08: creator can list contributions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/contributions?status=pending`,
      headers: injectHeaders(creatorToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((x: { id: string }) => x.id === contributionId)).toBe(true)
  })

  it('CONTRIB-08: non-admin cannot list contributions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(403)
  })

  it('CONTRIB-03/FILE-01/02/03/05: owner can request and confirm proof upload', async () => {
    const proofReq = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/proof`,
      headers: injectHeaders(memberToken),
      payload: {
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024
      }
    })

    expect(proofReq.statusCode).toBe(200)
    const proofPayload = proofReq.json()
    expect(proofPayload.fileKey).toBeTruthy()
    if (app.demoMode) {
      expect(proofPayload.uploadUrl).toContain('/local-uploads/')
    }

    const confirm = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/proof/confirm`,
      headers: injectHeaders(memberToken),
      payload: {
        fileKey: proofPayload.fileKey,
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024
      }
    })
    expect(confirm.statusCode).toBe(201)
  })

  it('CONTRIB-04/06 + LEDGER-01/02/04: admin verify writes ledger and promotes member', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/verify`,
      headers: injectHeaders(creatorToken)
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().contribution.status).toBe('verified')
    expect(res.json().ledgerEntry.type).toBe('CONTRIBUTION_VERIFIED')

    const treasury = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/treasury`,
      headers: injectHeaders(memberToken)
    })
    expect(Number(treasury.json().balance)).toBe(250)
    if (app.demoMode) {
      expect(treasury.json().balanceLabel.toLowerCase()).toContain('simulated')
    }

    const member = await app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId: memberId } }
    })
    expect(member?.role).toBe('contributor')
  })

  it('CONTRIB-07: re-verifying verified contribution returns conflict', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/verify`,
      headers: injectHeaders(creatorToken)
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('CONTRIBUTION_NOT_PENDING')
  })

  it('CONTRIB-05: admin can reject pending contribution with reason', async () => {
    const pending = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken),
      payload: { amount: 50 }
    })
    const pendingId = pending.json().id

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/contributions/${pendingId}/reject`,
      headers: injectHeaders(creatorToken),
      payload: { reason: 'Invalid proof' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('rejected')
    expect(res.json().rejectionReason).toBe('Invalid proof')
  })

  it('LEDGER-05/FILE-04: admin can view ledger and proof URL; outsider blocked', async () => {
    const ledger = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/ledger`,
      headers: injectHeaders(creatorToken)
    })
    expect(ledger.statusCode).toBe(200)
    expect(Array.isArray(ledger.json().items)).toBe(true)

    const contribution = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}`,
      headers: injectHeaders(memberToken)
    })
    const proofId = contribution.json().proofDocuments[0].id

    const proofAdmin = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/proof/${proofId}/view`,
      headers: injectHeaders(creatorToken)
    })
    expect(proofAdmin.statusCode).toBe(200)
    expect(proofAdmin.json().downloadUrl).toContain('/local-uploads/')

    const proofOutsider = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/contributions/${contributionId}/proof/${proofId}/view`,
      headers: injectHeaders(outsiderToken)
    })
    expect(proofOutsider.statusCode).toBe(403)
  })
})
