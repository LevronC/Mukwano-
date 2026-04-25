import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders, signupWithVerifiedEmail } from '../helpers/app.js'

const DOMAIN = '@governance.example'

let app: FastifyInstance
let creatorToken: string
let memberToken: string
let outsiderToken: string
let contributorToken: string
let circleId: string
let pendingContributionId: string
let proposalId: string
let outsiderUserId: string

function signExpiredAccessJwt(
  secret: string,
  payload: { sub: string; id: string; email: string; isGlobalAdmin: boolean }
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: now - 120,
      iat: now - 3600
    }),
    'utf8'
  ).toString('base64url')
  const data = `${header}.${body}`
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

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
  const contributor = await signup('contributor')

  creatorToken = creator.accessToken
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken
  outsiderUserId = outsider.userId
  contributorToken = contributor.accessToken

  const circleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(creatorToken),
    payload: {
      name: 'Governance Circle',
      goalAmount: 10000,
      governance: {
        whoCanPropose: 'contributor',
        quorumPercent: 51,
        approvalPercent: 51,
        proposalDurationDays: 7
      }
    }
  })
  circleId = circleRes.json().id

  await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/join`,
    headers: injectHeaders(memberToken)
  })
  await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/join`,
    headers: injectHeaders(contributorToken)
  })

  const contributorUserId = (app.jwt.access.decode(contributorToken) as { id: string }).id
  await app.prisma.circleMembership.update({
    where: { circleId_userId: { circleId, userId: contributorUserId } },
    data: { role: 'contributor' }
  })

  const contribRes = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/contributions`,
    headers: injectHeaders(memberToken),
    payload: { amount: 25, note: 'pending for S-07' }
  })
  expect(contribRes.statusCode).toBe(201)
  pendingContributionId = contribRes.json().id

  const proposalRes = await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/proposals`,
    headers: injectHeaders(contributorToken),
    payload: {
      title: 'Gov scenario proposal',
      description: 'Voting rules',
      requestedAmount: 100
    }
  })
  expect(proposalRes.statusCode).toBe(201)
  proposalId = proposalRes.json().id
})

afterAll(async () => {
  await app.prisma.circle.deleteMany({ where: { creator: { email: { endsWith: DOMAIN } } } })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('S-07 — only circle admin/creator can verify a contribution', () => {
  it('returns 403 INSUFFICIENT_ROLE when a regular member calls verify', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/contributions/${pendingContributionId}/verify`,
      headers: injectHeaders(memberToken)
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('INSUFFICIENT_ROLE')
  })
})

describe('S-04 — non-member cannot contribute', () => {
  it('returns 403 NOT_A_MEMBER for POST contributions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/contributions`,
      headers: injectHeaders(outsiderToken),
      payload: { amount: 50 }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('NOT_A_MEMBER')
  })
})

describe('S-10 — double vote', () => {
  it('returns 409 DUPLICATE_VOTE on second vote from same user', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'yes' }
    })
    expect(first.statusCode).toBe(201)

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${proposalId}/vote`,
      headers: injectHeaders(memberToken),
      payload: { vote: 'no' }
    })
    expect(second.statusCode).toBe(409)
    expect(second.json().error.code).toBe('DUPLICATE_VOTE')
  })
})

describe('S-01 — unauthenticated access', () => {
  it('returns 200 for GET /api/v1/circles without JWT (public route)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/circles' })
    expect(res.statusCode).toBe(200)
  })
})

describe('S-09 — vote tally is server-computed; client cannot affect counts via extra fields', () => {
  it('strips unknown fields (Fastify removeAdditional); voteSummary reflects DB not client tally', async () => {
    const create = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals`,
      headers: injectHeaders(contributorToken),
      payload: {
        title: 'Second proposal',
        description: 'For S-09 only',
        requestedAmount: 40
      }
    })
    expect(create.statusCode).toBe(201)
    const pid = create.json().id as string

    const withSpoofedTally = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/proposals/${pid}/vote`,
      headers: injectHeaders(contributorToken),
      payload: { vote: 'yes', tally: 99 }
    })
    expect(withSpoofedTally.statusCode).toBe(201)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/proposals/${pid}`,
      headers: injectHeaders(contributorToken)
    })
    expect(detail.statusCode).toBe(200)
    const summary = detail.json().voteSummary
    expect(summary.cast).toBe(1)
    expect(summary.yes).toBe(1)
    expect(summary.no).toBe(0)
  })
})

describe('S-03 — non–global-admin cannot set global admin', () => {
  it('returns 403 GLOBAL_ADMIN_REQUIRED on PATCH /admin/members/:id/role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/members/${outsiderUserId}/role`,
      headers: injectHeaders(memberToken),
      payload: { isGlobalAdmin: true }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('GLOBAL_ADMIN_REQUIRED')
  })
})

describe('S-02 — expired JWT', () => {
  it('returns 401 TOKEN_EXPIRED', async () => {
    const token = signExpiredAccessJwt(app.config.JWT_SECRET, {
      sub: outsiderUserId,
      id: outsiderUserId,
      email: `outsider${DOMAIN}`,
      isGlobalAdmin: false
    })
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(token)
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('TOKEN_EXPIRED')
  })
})
