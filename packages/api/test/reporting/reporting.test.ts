import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders, loginUser, signupWithVerifiedEmail } from '../helpers/app.js'

const DOMAIN = '@reporting.example'

let app: FastifyInstance
let adminToken: string
let adminUserId: string
let globalOnlyAdminToken: string
let globalOnlyAdminUserId: string
let memberToken: string
let outsiderToken: string
let memberId: string
let circleId: string
let projectId: string

async function signup(suffix: string): Promise<{ accessToken: string; userId: string }> {
  return signupWithVerifiedEmail(app, `${suffix}${DOMAIN}`, 'password123', suffix)
}

beforeAll(async () => {
  app = await createTestApp()

  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })

  const admin = await signup('admin')
  const globalOnly = await signup('globalonly')
  const member = await signup('member')
  const outsider = await signup('outsider')

  adminUserId = admin.userId
  globalOnlyAdminUserId = globalOnly.userId
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken
  memberId = member.userId

  await app.prisma.user.update({
    where: { id: admin.userId },
    data: { isGlobalAdmin: true, platformRole: 'GLOBAL_ADMIN' }
  })
  await app.prisma.user.update({
    where: { id: globalOnly.userId },
    data: { isGlobalAdmin: true, platformRole: 'GLOBAL_ADMIN' }
  })

  const adminSession = await loginUser(app, `admin${DOMAIN}`, 'password123')
  const globalOnlySession = await loginUser(app, `globalonly${DOMAIN}`, 'password123')
  adminToken = adminSession.accessToken
  globalOnlyAdminToken = globalOnlySession.accessToken

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

  await app.prisma.circleMembership.update({
    where: { circleId_userId: { circleId, userId: memberId } },
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
  await app.inject({
    method: 'PATCH',
    url: `/api/v1/circles/${circleId}/projects/${projectId}`,
    headers: injectHeaders(adminToken),
    payload: { sector: 'Education', countryCode: 'UG' }
  })
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

  it('PORT-02: portfolio summary returns totals and analytics', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/portfolio/summary', headers: injectHeaders(memberToken) })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      totalContributed: number
      totalVerified: number
      inProjects: number
      bySector: Array<{ sector: string; amount: number; percent: number }>
      byCountry: Array<{ countryCode: string; label: string; amount: number; percent: number }>
      timeSeries: Array<{ period: string; amount: number }>
      activeProjects: Array<{ id: string; title: string }>
    }
    expect(typeof body.totalContributed).toBe('number')
    expect(typeof body.totalVerified).toBe('number')
    expect(typeof body.inProjects).toBe('number')
    expect(Array.isArray(body.bySector)).toBe(true)
    expect(Array.isArray(body.byCountry)).toBe(true)
    expect(body.bySector.some((s) => s.sector === 'Education')).toBe(true)
    expect(body.byCountry.some((c) => c.countryCode === 'UG')).toBe(true)
    expect(Array.isArray(body.timeSeries)).toBe(true)
    expect(Array.isArray(body.activeProjects)).toBe(true)
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

  it('ADMIN-03b: repeated global admin update is idempotent and does not duplicate audit rows', async () => {
    const before = await app.prisma.auditLog.count({
      where: { action: 'GLOBAL_ADMIN_TOGGLED', subjectUserId: memberId }
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/members/${memberId}/role`,
      headers: injectHeaders(adminToken),
      payload: { isGlobalAdmin: true }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().platformRole).toBe('GLOBAL_ADMIN')

    const after = await app.prisma.auditLog.count({
      where: { action: 'GLOBAL_ADMIN_TOGGLED', subjectUserId: memberId }
    })
    expect(after).toBe(before)
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

  it('ADMIN-08: global admin can disable/delete circles and proposals', async () => {
    const circle = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      headers: injectHeaders(adminToken),
      payload: { name: 'Ops Circle', goalAmount: 2500, governance: { whoCanPropose: 'member' } }
    })
    expect(circle.statusCode).toBe(201)
    const opsCircleId = circle.json().id as string

    const proposal = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${opsCircleId}/proposals`,
      headers: injectHeaders(adminToken),
      payload: { title: 'Ops Proposal', description: 'ops', requestedAmount: 100 }
    })
    expect(proposal.statusCode).toBe(201)
    const opsProposalId = proposal.json().id as string

    const disableProposal = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/proposals/${opsProposalId}/disable`,
      headers: injectHeaders(adminToken)
    })
    expect(disableProposal.statusCode).toBe(200)
    expect(disableProposal.json().status).toBe('cancelled')

    const deleteProposal = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/proposals/${opsProposalId}`,
      headers: injectHeaders(adminToken)
    })
    expect(deleteProposal.statusCode).toBe(200)

    const disableCircle = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/circles/${opsCircleId}/disable`,
      headers: injectHeaders(adminToken)
    })
    expect(disableCircle.statusCode).toBe(200)
    expect(disableCircle.json().status).toBe('closed')

    const deleteCircle = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/circles/${opsCircleId}`,
      headers: injectHeaders(adminToken)
    })
    expect(deleteCircle.statusCode).toBe(200)
    expect(deleteCircle.json().ok).toBe(true)
  })

  it('ADMIN-09: support flags can be created and triaged without duplicate no-op audits', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/support/flags',
      headers: injectHeaders(memberToken),
      payload: {
        subjectUserId: globalOnlyAdminUserId,
        reason: 'Suspicious admin behavior for triage'
      }
    })
    expect(create.statusCode).toBe(201)
    const flagId = create.json().id as string

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/flags?status=open',
      headers: injectHeaders(adminToken)
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().some((flag: { id: string }) => flag.id === flagId)).toBe(true)

    const before = (
      await app.prisma.auditLog.findMany({
        where: { action: 'SUPPORT_FLAG_STATUS' },
        select: { metadata: true }
      })
    ).filter((row) => (row.metadata as { flagId?: string } | null)?.flagId === flagId).length

    const firstPatch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/support/flags/${flagId}`,
      headers: injectHeaders(adminToken),
      payload: { status: 'triaged' }
    })
    expect(firstPatch.statusCode).toBe(200)
    expect(firstPatch.json().status).toBe('triaged')

    const secondPatch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/support/flags/${flagId}`,
      headers: injectHeaders(adminToken),
      payload: { status: 'triaged' }
    })
    expect(secondPatch.statusCode).toBe(200)
    expect(secondPatch.json().status).toBe('triaged')

    const after = (
      await app.prisma.auditLog.findMany({
        where: { action: 'SUPPORT_FLAG_STATUS' },
        select: { metadata: true }
      })
    ).filter((row) => (row.metadata as { flagId?: string } | null)?.flagId === flagId).length
    expect(after).toBe(before + 1)
  })

  it('ADMIN-10: stale admin JWT loses access after DB demotion', async () => {
    await app.prisma.user.update({
      where: { id: globalOnlyAdminUserId },
      data: { isGlobalAdmin: false, platformRole: 'USER' }
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ledger',
      headers: injectHeaders(globalOnlyAdminToken)
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('GLOBAL_ADMIN_REQUIRED')
  })

  it('ADMIN-11: cannot remove the last global admin', async () => {
    await app.prisma.user.updateMany({
      where: { id: { not: adminUserId } },
      data: { isGlobalAdmin: false, platformRole: 'USER' }
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/members/${adminUserId}/role`,
      headers: injectHeaders(adminToken),
      payload: { isGlobalAdmin: false }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('LAST_GLOBAL_ADMIN')
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
