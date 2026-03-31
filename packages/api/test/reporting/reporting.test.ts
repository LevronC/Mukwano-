import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@reporting.example'

let app: FastifyInstance
let adminToken: string
let globalOnlyAdminToken: string
let memberToken: string
let outsiderToken: string
let memberId: string
let circleId: string
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

  const admin = await signup('admin')
  const globalOnly = await signup('globalonly')
  const member = await signup('member')
  const outsider = await signup('outsider')

  adminToken = admin.accessToken
  globalOnlyAdminToken = globalOnly.accessToken
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken
  memberId = member.userId

  await app.prisma.user.update({ where: { id: admin.userId }, data: { isGlobalAdmin: true } })
  await app.prisma.user.update({ where: { id: globalOnly.userId }, data: { isGlobalAdmin: true } })

  const circle = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(adminToken),
    payload: { name: 'Reporting Circle', goalAmount: 10000, governance: { whoCanPropose: 'contributor' } }
  })
  circleId = circle.json().id

  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/join`, headers: injectHeaders(memberToken) })

  const contribution = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/contributions`,
    headers: injectHeaders(memberToken),
    payload: { amount: 200 }
  })
  const contributionId = contribution.json().id
  await app.inject({ method: 'PATCH', url: `/api/v1/circles/${circleId}/contributions/${contributionId}/verify`, headers: injectHeaders(adminToken) })

  const memberJwt = app.jwt.access.decode(memberToken) as { id: string }
  await app.prisma.circleMembership.update({
    where: { circleId_userId: { circleId, userId: memberJwt.id } },
    data: { role: 'contributor' }
  })

  const proposal = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/proposals`,
    headers: injectHeaders(memberToken),
    payload: { title: 'reporting proposal', description: 'desc', requestedAmount: 100 }
  })
  const proposalId = proposal.json().id
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`, headers: injectHeaders(adminToken), payload: { vote: 'yes' } })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`, headers: injectHeaders(memberToken), payload: { vote: 'yes' } })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/proposals/${proposalId}/close`, headers: injectHeaders(adminToken) })

  const project = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/projects`,
    headers: injectHeaders(adminToken),
    payload: { proposalId }
  })
  projectId = project.json().id
  await app.inject({ method: 'PATCH', url: `/api/v1/circles/${circleId}/projects/${projectId}`, headers: injectHeaders(adminToken), payload: { status: 'executing' } })
  await app.inject({ method: 'POST', url: `/api/v1/circles/${circleId}/projects/${projectId}/updates`, headers: injectHeaders(adminToken), payload: { content: 'started', percentComplete: 10 } })
})

afterAll(async () => {
  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('Phase 6 - portfolio/dashboard/admin', () => {
  it('PORT-01: member portfolio includes personal contributions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/portfolio', headers: injectHeaders(memberToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBeGreaterThan(0)
  })

  it('PORT-02: portfolio summary returns totals', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/portfolio/summary', headers: injectHeaders(memberToken) })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().totalContributed).toBe('number')
    expect(typeof res.json().totalVerified).toBe('number')
    expect(typeof res.json().inProjects).toBe('number')
  })

  it('DASH-01/02: dashboard includes circles, counts and recent activity', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard', headers: injectHeaders(memberToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().circles)).toBe(true)
    expect(typeof res.json().pendingContributions).toBe('number')
    expect(typeof res.json().unvotedProposals).toBe('number')
    expect(Array.isArray(res.json().recentActivity)).toBe(true)
    expect(res.json().recentActivity.length).toBeLessThanOrEqual(20)
  })

  it('ADMIN-01/04: global admin can view pending contributions and global ledger', async () => {
    const pending = await app.inject({ method: 'GET', url: '/api/v1/admin/contributions/pending', headers: injectHeaders(adminToken) })
    expect(pending.statusCode).toBe(200)
    expect(Array.isArray(pending.json())).toBe(true)

    const ledger = await app.inject({ method: 'GET', url: '/api/v1/admin/ledger', headers: injectHeaders(adminToken) })
    expect(ledger.statusCode).toBe(200)
    expect(Array.isArray(ledger.json())).toBe(true)
  })

  it('ADMIN-02: global admin can list members and toggle global admin flag', async () => {
    const members = await app.inject({ method: 'GET', url: '/api/v1/admin/members', headers: injectHeaders(adminToken) })
    expect(members.statusCode).toBe(200)
    expect(Array.isArray(members.json())).toBe(true)

    const toggle = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/members/${memberId}/role`,
      headers: injectHeaders(adminToken),
      payload: { isGlobalAdmin: true }
    })
    expect(toggle.statusCode).toBe(200)
    expect(toggle.json().isGlobalAdmin).toBe(true)
  })

  it('ADMIN-03: global admin can view full activity log', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/activity', headers: injectHeaders(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBeGreaterThan(0)
  })

  it('ADMIN-05: global admin can verify pending contribution through admin endpoint', async () => {
    const pendingContribution = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken),
      payload: { amount: 123 }
    })
    expect(pendingContribution.statusCode).toBe(201)
    const contributionId = pendingContribution.json().id as string

    const verify = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/contributions/${contributionId}/verify`,
      headers: injectHeaders(adminToken)
    })
    expect(verify.statusCode).toBe(200)
    expect(verify.json().contribution.status).toBe('verified')
  })

  it('ADMIN-05b: global admin not in circle can still verify via admin endpoint', async () => {
    const pendingContribution = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken),
      payload: { amount: 77 }
    })
    expect(pendingContribution.statusCode).toBe(201)
    const contributionId = pendingContribution.json().id as string

    const verify = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/contributions/${contributionId}/verify`,
      headers: injectHeaders(globalOnlyAdminToken)
    })
    expect(verify.statusCode).toBe(200)
    expect(verify.json().contribution.status).toBe('verified')
  })

  it('ADMIN-06: global admin can reject pending contribution through admin endpoint', async () => {
    const pendingContribution = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(memberToken),
      payload: { amount: 99 }
    })
    expect(pendingContribution.statusCode).toBe(201)
    const contributionId = pendingContribution.json().id as string

    const reject = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/contributions/${contributionId}/reject`,
      headers: injectHeaders(adminToken),
      payload: { reason: 'Invalid transfer reference' }
    })
    expect(reject.statusCode).toBe(200)
    expect(reject.json().status).toBe('rejected')
  })

  it('ADMIN-07: global admin can access metrics and system health', async () => {
    const metrics = await app.inject({ method: 'GET', url: '/api/v1/admin/metrics', headers: injectHeaders(adminToken) })
    expect(metrics.statusCode).toBe(200)
    expect(typeof metrics.json().pendingVerifications).toBe('number')
    expect(typeof metrics.json().activeProjects).toBe('number')

    const health = await app.inject({ method: 'GET', url: '/api/v1/admin/system-health', headers: injectHeaders(adminToken) })
    expect(health.statusCode).toBe(200)
    expect(health.json().api).toBe('healthy')
    expect(health.json().database).toBe('healthy')
  })

  it('admin endpoints reject non-global-admin users', async () => {
    const pending = await app.inject({ method: 'GET', url: '/api/v1/admin/contributions/pending', headers: injectHeaders(outsiderToken) })
    expect(pending.statusCode).toBe(403)

    const ledger = await app.inject({ method: 'GET', url: '/api/v1/admin/ledger', headers: injectHeaders(outsiderToken) })
    expect(ledger.statusCode).toBe(403)

    const verify = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/contributions/00000000-0000-0000-0000-000000000000/verify',
      headers: injectHeaders(outsiderToken)
    })
    expect(verify.statusCode).toBe(403)
  })
})
