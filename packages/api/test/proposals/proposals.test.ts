import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@proposal.example'

let app: FastifyInstance
let creatorToken: string
let contributorToken: string
let memberToken: string
let outsiderToken: string
let circleId: string
let proposalId: string

async function signup(suffix: string): Promise<{ accessToken: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: {
      email: `${suffix}${DOMAIN}`,
      password: 'password123',
      displayName: suffix
    }
  })
  const body = res.json()
  return { accessToken: body.accessToken, userId: body.user.id }
}

beforeAll(async () => {
  app = await createTestApp()

  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })

  const creator = await signup('creator')
  const contributor = await signup('contributor')
  const member = await signup('member')
  const outsider = await signup('outsider')

  creatorToken = creator.accessToken
  contributorToken = contributor.accessToken
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken

  const circleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(creatorToken),
    payload: {
      name: 'Proposal Circle',
      goalAmount: 10000,
      governance: { whoCanPropose: 'contributor', quorumPercent: 51, approvalPercent: 51, proposalDurationDays: 1 }
    }
  })
  circleId = circleRes.json().id

  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/join`, headers: injectHeaders(contributorToken) })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/join`, headers: injectHeaders(memberToken) })

  const contribUserId = (app.jwt.access.decode(contributorToken) as { id: string }).id
  await app.prisma.circleMembership.update({
    where: { circleId_userId: { circleId, userId: contribUserId } },
    data: { role: 'contributor' }
  })
})

afterAll(async () => {
  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('Phase 4 - proposals and voting', () => {
  it('PROP-01: contributor can create proposal with deadline', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(contributorToken),
      payload: {
        title: 'Build Water Project',
        description: 'Proposal details',
        requestedAmount: 500
      }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('open')
    expect(res.json().votingDeadline).toBeTruthy()
    proposalId = res.json().id
  })

  it('PROP-01: member blocked by whoCanPropose rule', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(memberToken),
      payload: {
        title: 'Should fail',
        description: 'No permission',
        requestedAmount: 100
      }
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('INSUFFICIENT_ROLE_TO_PROPOSE')
  })

  it('PROP-02/03: member can list and view proposal detail', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(memberToken)
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().some((x: { id: string }) => x.id === proposalId)).toBe(true)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}`,
      headers: injectHeaders(memberToken)
    })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().voteSummary.cast).toBe(0)
  })

  it('PROP-04/05: member can vote once; duplicate vote is 409', async () => {
    const vote1 = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'yes' }
    })
    expect(vote1.statusCode).toBe(201)

    const vote2 = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'no' }
    })
    expect(vote2.statusCode).toBe(409)
    expect(vote2.json().error.code).toBe('DUPLICATE_VOTE')
  })

  it('PROP-04: outsider cannot vote (not member)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(outsiderToken),
      payload: { vote: 'yes' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('PROP-07/08: creator can close proposal and set closed_passed/failed', async () => {
    const voteContributor = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(contributorToken),
      payload: { vote: 'yes' }
    })
    expect([201, 409]).toContain(voteContributor.statusCode)

    const close = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/close`,
      headers: injectHeaders(creatorToken)
    })

    expect(close.statusCode).toBe(200)
    expect(['closed_passed', 'closed_failed']).toContain(close.json().status)
    expect(typeof close.json().quorumMet).toBe('boolean')
  })

  it('PROP-04: closed proposal rejects new votes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'abstain' }
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('PROPOSAL_NOT_OPEN')
  })

  it('PROP-04: expired deadline rejects vote with PROPOSAL_VOTING_CLOSED', async () => {
    const create = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(contributorToken),
      payload: { title: 'Expired proposal', description: 'deadline in the past', requestedAmount: 50 }
    })
    expect(create.statusCode).toBe(201)
    const pid = create.json().id

    await app.prisma.proposal.update({
      where: { id: pid },
      data: { votingDeadline: new Date(Date.now() - 1000) }
    })

    const vote = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${pid}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'yes' }
    })
    expect(vote.statusCode).toBe(409)
    expect(vote.json().error.code).toBe('PROPOSAL_VOTING_CLOSED')
  })

  it('PROP-06: proposer/admin can cancel open proposal', async () => {
    const create = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(contributorToken),
      payload: {
        title: 'Cancel me',
        description: 'for cancellation test',
        requestedAmount: 100
      }
    })
    expect(create.statusCode).toBe(201)
    const pid = create.json().id

    const cancel = await app.inject({
      method: 'DELETE',
      url: `/api/v1/circles/${circleId}/proposals/${pid}`,
      headers: injectHeaders(contributorToken)
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().status).toBe('cancelled')
  })
})
