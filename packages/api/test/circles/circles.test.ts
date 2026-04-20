import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, injectHeaders } from '../helpers/app.js'

const DOMAIN = '@circles.example'

let app: FastifyInstance

// Tokens for the three principal actors
let creatorToken: string
let memberToken: string
let outsiderToken: string
let pendingToken: string
let memberId: string

// The circle created in setup
let circleId: string

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

  // Pre-cleanup: remove any stale data from previous interrupted runs
  await app.prisma.circle.deleteMany({
    where: { creator: { email: { endsWith: DOMAIN } } }
  })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })

  // Provision three users
  const creator = await signup('creator')
  const member = await signup('member')
  const outsider = await signup('outsider')
  const pending = await signup('pending')

  creatorToken = creator.accessToken
  memberId = member.userId
  memberToken = member.accessToken
  outsiderToken = outsider.accessToken
  pendingToken = pending.accessToken

  // Creator creates the main test circle
  const circleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/circles',
    headers: injectHeaders(creatorToken),
    payload: {
      name: 'Test Circle',
      description: 'A circle for testing',
      goalAmount: 10000,
      governance: {
        quorumPercent: 60,
        whoCanPropose: 'contributor'
      }
    }
  })
  circleId = circleRes.json().id

  // Member joins the circle
  await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/join`,
    headers: injectHeaders(memberToken)
  })

  await app.inject({
    method: 'POST',
    url: `/api/v1/circles/${circleId}/join-request`,
    headers: injectHeaders(pendingToken)
  })
})

afterAll(async () => {
  // Delete circles created by test users (includes all circles regardless of name)
  await app.prisma.circle.deleteMany({
    where: { creator: { email: { endsWith: DOMAIN } } }
  })
  await app.prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } })
  await app.close()
})

describe('POST /api/v1/circles (CIRCLE-01)', () => {
  it('creates circle with creator role and governance config atomically', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      headers: injectHeaders(creatorToken),
      payload: {
        name: 'Test Circle Created',
        goalAmount: 5000
      }
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeTruthy()
    expect(body.name).toBe('Test Circle Created')

    // Verify creator membership was created
    const creatorUserId = (app.jwt.access.decode(creatorToken) as { id: string }).id
    const membership = await app.prisma.circleMembership.findFirst({
      where: { circleId: body.id, userId: creatorUserId }
    })
    expect(membership?.role).toBe('creator')

    // Verify governance config was created
    const gov = await app.prisma.governanceConfig.findUnique({
      where: { circleId: body.id }
    })
    expect(gov).not.toBeNull()
    expect(gov?.quorumPercent).toBe(51) // default
  })

  it('returns 422 when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      headers: injectHeaders(creatorToken),
      payload: { goalAmount: 5000 }
    })

    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 422 when goalAmount is zero or negative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      headers: injectHeaders(creatorToken),
      payload: { name: 'Bad Circle', goalAmount: 0 }
    })

    expect(res.statusCode).toBe(422)
  })

  it('requires authentication (CIRCLE-02)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      payload: { name: 'No Auth', goalAmount: 1000 }
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/circles (CIRCLE-02)', () => {
  it('returns list of all circles for any authenticated user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/circles',
      headers: injectHeaders(outsiderToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    const found = body.find((c: { id: string }) => c.id === circleId)
    expect(found).toBeTruthy()
  })

  it('returns 200 for unauthenticated requests (public route)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/circles'
    })

    expect(res.statusCode).toBe(200)
  })
})

describe('GET /api/v1/circles/:id (CIRCLE-03, GOV-01)', () => {
  it('returns circle detail with governance config for members', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(circleId)
    expect(body.governanceConfig).toBeTruthy()
    expect(typeof body.governanceConfig.quorumPercent).toBe('number')
    expect(typeof body.governanceConfig.whoCanPropose).toBe('string')
    expect(body.membershipRole).toBe('member')
  })

  it('returns circle detail for non-members with membershipRole set to null', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(outsiderToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(circleId)
    expect(body.membershipRole).toBeNull()
    expect(body.governanceConfig).toBeTruthy()
  })

  it('returns circle detail for pending members with membershipRole set to pending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(pendingToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(circleId)
    expect(body.membershipRole).toBe('pending')
  })

  it('returns 404 for non-existent circle', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/circles/00000000-0000-0000-0000-000000000000',
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/circles/:id/members', () => {
  it('allows any member to list members', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/members`,
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    const roles = body.map((m: { role: string }) => m.role)
    expect(roles).toContain('creator')
    expect(roles).toContain('member')
  })

  it('blocks non-members from listing members', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/members`,
      headers: injectHeaders(outsiderToken)
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('PATCH /api/v1/circles/:id/members/:userId/role (CIRCLE-05)', () => {
  it('admin can update a member role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/members/${memberId}/role`,
      headers: injectHeaders(creatorToken),
      payload: { role: 'contributor' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().role).toBe('contributor')
  })

  it('non-admin gets 403 when trying to change a role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/members/${memberId}/role`,
      headers: injectHeaders(memberToken),
      payload: { role: 'admin' }
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/v1/circles/:id/join (CIRCLE-03)', () => {
  it('allows a new user to join a circle', async () => {
    const { accessToken } = await signup('joiner')

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/join`,
      headers: injectHeaders(accessToken)
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().role).toBe('member')
  })

  it('returns 409 when already a member', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/join`,
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('ALREADY_MEMBER')
  })
})

describe('Join request approval workflow', () => {
  it('allows a user to submit join request and committee to approve', async () => {
    const { accessToken, userId } = await signup('requester')

    const requestRes = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/join-request`,
      headers: injectHeaders(accessToken)
    })
    expect(requestRes.statusCode).toBe(201)
    expect(requestRes.json().role).toBe('pending')

    const pendingList = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/join-requests`,
      headers: injectHeaders(creatorToken)
    })
    expect(pendingList.statusCode).toBe(200)
    expect(Array.isArray(pendingList.json())).toBe(true)
    expect(pendingList.json().some((entry: { userId: string }) => entry.userId === userId)).toBe(true)

    const approveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}/join-requests/${userId}/approve`,
      headers: injectHeaders(creatorToken)
    })
    expect(approveRes.statusCode).toBe(200)
    expect(approveRes.json().role).toBe('member')
  })

  it('allows committee to reject join request', async () => {
    const { accessToken, userId } = await signup('requester2')

    const requestRes = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/join-request`,
      headers: injectHeaders(accessToken)
    })
    expect(requestRes.statusCode).toBe(201)

    const rejectRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/circles/${circleId}/join-requests/${userId}/reject`,
      headers: injectHeaders(creatorToken)
    })
    expect(rejectRes.statusCode).toBe(200)

    const pendingList = await app.inject({
      method: 'GET',
      url: `/api/v1/circles/${circleId}/join-requests`,
      headers: injectHeaders(creatorToken)
    })
    expect(pendingList.statusCode).toBe(200)
    expect(pendingList.json().some((entry: { userId: string }) => entry.userId === userId)).toBe(false)
  })
})

describe('POST /api/v1/circles/:id/leave', () => {
  it('allows a regular member to leave', async () => {
    const { accessToken } = await signup('leaver')

    await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/join`,
      headers: injectHeaders(accessToken)
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/leave`,
      headers: injectHeaders(accessToken)
    })

    expect(res.statusCode).toBe(200)
  })

  it('creator cannot leave their circle (CIRCLE-06)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/leave`,
      headers: injectHeaders(creatorToken)
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('CREATOR_CANNOT_LEAVE')
  })
})

describe('PATCH /api/v1/circles/:id', () => {
  it('admin can update circle name and goalAmount', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(creatorToken),
      payload: { name: 'Updated Circle Name', goalAmount: 20000 }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Updated Circle Name')
  })

  it('non-admin gets 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/circles/${circleId}`,
      headers: injectHeaders(memberToken),
      payload: { name: 'Hijacked Name' }
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/v1/circles/:id/close (CIRCLE-09)', () => {
  it('admin can close a circle', async () => {
    // Create a separate circle for close test so it doesn't affect other tests
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/circles',
      headers: injectHeaders(creatorToken),
      payload: { name: 'Test Circle To Close', goalAmount: 1000 }
    })
    const toCloseId = createRes.json().id

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${toCloseId}/close`,
      headers: injectHeaders(creatorToken)
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('closed')
  })

  it('non-admin gets 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/circles/${circleId}/close`,
      headers: injectHeaders(memberToken)
    })

    expect(res.statusCode).toBe(403)
  })
})
