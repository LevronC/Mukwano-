import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@projects.example'

let app: FastifyInstance
let creatorToken: string
let contributorToken: string
let memberToken: string
let circleId: string
let proposalId: string
let projectId: string

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

  creatorToken = creator.accessToken
  contributorToken = contributor.accessToken
  memberToken = member.accessToken

  const circleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(creatorToken),
    payload: { name: 'Project Circle', goalAmount: 10000, governance: { whoCanPropose: 'contributor' } }
  })
  circleId = circleRes.json().id

  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/join`, headers: injectHeaders(contributorToken) })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/join`, headers: injectHeaders(memberToken) })

  const contributorId = (app.jwt.access.decode(contributorToken) as { id: string }).id
  await app.prisma.circleMembership.update({
    where: { circleId_userId: { circleId, userId: contributorId } },
    data: { role: 'contributor' }
  })

  // Seed treasury via member contribution verify
  const c = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/contributions`,
    headers: injectHeaders(memberToken),
    payload: { amount: 500 }
  })
  const contributionId = c.json().id
  await app.inject({
    method: 'PATCH',
    url: `/api/v1/circles/${circleId}/contributions/${contributionId}/verify`,
    headers: injectHeaders(creatorToken)
  })

  const prop = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/proposals`,
    headers: injectHeaders(contributorToken),
    payload: { title: 'Project Proposal', description: 'build project', requestedAmount: 300 }
  })
  proposalId = prop.json().id

  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`, headers: injectHeaders(memberToken), payload: { vote: 'yes' } })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`, headers: injectHeaders(contributorToken), payload: { vote: 'yes' } })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/close`, headers: injectHeaders(creatorToken) })
})

afterAll(async () => {
  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('Phase 5 - projects', () => {
  it('PROJ-01: admin creates project from closed_passed proposal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/projects`,
      headers: injectHeaders(creatorToken),
      payload: { proposalId }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('approved')
    projectId = res.json().id
  })

  it('PROJ-02/03: transition to executing writes PROJECT_FUNDED debit', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/projects/${projectId}`,
      headers: injectHeaders(creatorToken),
      payload: { status: 'executing' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('executing')

    const ledger = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/ledger`,
      headers: injectHeaders(creatorToken)
    })
    const found = ledger.json().items.find((x: { type: string }) => x.type === 'PROJECT_FUNDED')
    expect(found).toBeTruthy()
    expect(Number(found.amount)).toBeLessThan(0)
  })

  it('PROJ-05: admin can post progress update on executing project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/projects/${projectId}/updates`,
      headers: injectHeaders(creatorToken),
      payload: { content: 'Milestone reached', percentComplete: 40 }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().content).toBe('Milestone reached')
  })

  it('PROJ-06: members can view project detail and updates', async () => {
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/projects/${projectId}`,
      headers: injectHeaders(memberToken)
    })
    expect(detail.statusCode).toBe(200)

    const updates = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/projects/${projectId}/updates`,
      headers: injectHeaders(memberToken)
    })
    expect(updates.statusCode).toBe(200)
    expect(Array.isArray(updates.json())).toBe(true)
    expect(updates.json().length).toBeGreaterThan(0)
  })

  it('PROJ-02: transition executing -> complete', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/projects/${projectId}`,
      headers: injectHeaders(creatorToken),
      payload: { status: 'complete' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('complete')
    expect(res.json().completedAt).toBeTruthy()
  })

  it('PROJ-04: rejects execution when treasury is insufficient', async () => {
    const prop = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(contributorToken),
      payload: { title: 'Big budget', description: 'too expensive', requestedAmount: 10000 }
    })
    const pid = prop.json().id
    await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${pid}/vote`, headers: injectHeaders(memberToken), payload: { vote: 'yes' } })
    await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${pid}/vote`, headers: injectHeaders(contributorToken), payload: { vote: 'yes' } })
    await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${pid}/close`, headers: injectHeaders(creatorToken) })

    const create = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/projects`,
      headers: injectHeaders(creatorToken),
      payload: { proposalId: pid }
    })
    const expensiveProjectId = create.json().id

    const exec = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/projects/${expensiveProjectId}`,
      headers: injectHeaders(creatorToken),
      payload: { status: 'executing' }
    })

    expect(exec.statusCode).toBe(422)
    expect(exec.json().error.code).toBe('INSUFFICIENT_TREASURY')
  })
})
