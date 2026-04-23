import { http, HttpResponse } from 'msw'

const ok = (data: any, status = 200) => HttpResponse.json(data, { status })

export const handlers = [
  http.post('/api/v1/auth/signup', () => ok({ user: { id: 'u1', email: 'creator@example.com', displayName: 'Creator', isGlobalAdmin: true }, accessToken: 'access-token', refreshToken: 'refresh-token' }, 201)),
  http.post('/api/v1/auth/login', () => ok({ user: { id: 'u1', email: 'creator@example.com', displayName: 'Creator', isGlobalAdmin: true }, accessToken: 'access-token', refreshToken: 'refresh-token' })),
  http.post('/api/v1/auth/logout', () => ok({ message: 'Logged out' })),
  http.post('/api/v1/auth/refresh', () => ok({ accessToken: 'next-access-token', refreshToken: 'next-refresh-token' })),
  http.get('/api/v1/auth/me', () => ok({ id: 'u1', email: 'creator@example.com', displayName: 'Creator', isGlobalAdmin: true })),
  http.patch('/api/v1/auth/me', () => ok({ id: 'u1', email: 'creator@example.com', displayName: 'Creator Updated' })),
  http.get('/api/v1/config', () =>
    ok({ demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow', emailConfigured: true })
  ),
  http.get('/api/v1/circles', () =>
    ok([{ id: 'c1', name: 'Mukwano Circle', goalAmount: 10000, status: 'active', verifiedRaisedAmount: '0' }])
  ),
  http.post('/api/v1/circles', () => ok({ id: 'c1', name: 'Mukwano Circle', goalAmount: 10000 }, 201)),
  http.get('/api/v1/circles/:id', () => ok({ id: 'c1', name: 'Mukwano Circle', status: 'active', goalAmount: 10000 })),
  http.patch('/api/v1/circles/:id', () => ok({ id: 'c1', name: 'Mukwano Circle Updated' })),
  http.post('/api/v1/circles/:id/join', () => ok({ circleId: 'c1', userId: 'u2', role: 'member' }, 201)),
  http.post('/api/v1/circles/:id/leave', () => ok({ message: 'Left circle' })),
  http.post('/api/v1/circles/:id/close', () => ok({ id: 'c1', status: 'closed' })),
  http.get('/api/v1/circles/:id/members', () => ok([{ circleId: 'c1', userId: 'u1', role: 'admin', user: { id: 'u1', email: 'creator@example.com', displayName: 'Creator' } }])),
  http.patch('/api/v1/circles/:id/members/:userId/role', () => ok({ circleId: 'c1', userId: 'u2', role: 'contributor' })),
  http.post('/api/v1/circles/:id/contributions', () => ok({ id: 'co1', amount: 250, status: 'pending' }, 201)),
  http.get('/api/v1/circles/:id/contributions', () => ok([{ id: 'co1', amount: 250, status: 'pending', userId: 'u2', note: 'first' }])),
  http.get('/api/v1/circles/:id/contributions/:cid', () => ok({ id: 'co1', amount: 250, status: 'pending' })),
  http.patch('/api/v1/circles/:id/contributions/:cid/verify', () => ok({ id: 'co1', status: 'verified' })),
  http.patch('/api/v1/circles/:id/contributions/:cid/reject', () => ok({ id: 'co1', status: 'rejected' })),
  http.post('/api/v1/circles/:id/contributions/:cid/proof', () => ok({ uploadUrl: 'http://localhost:4000/local-uploads/mock-key', fileKey: 'mock-key', expiresInSeconds: 900 })),
  http.post('/api/v1/circles/:id/contributions/:cid/proof/confirm', () => ok({ id: 'proof1', fileKey: 'mock-key', fileName: 'receipt.pdf' }, 201)),
  http.get('/api/v1/circles/:id/contributions/:cid/proof/:pid/view', () => ok({ downloadUrl: 'http://localhost:4000/local-uploads/mock-key' })),
  http.get('/api/v1/circles/:id/treasury', () => ok({ circleId: 'c1', balance: 5000, currency: 'USD', balanceLabel: 'USD 5,000.00 (simulated)' })),
  http.get('/api/v1/circles/:id/ledger', () => ok([{ id: 'l1', type: 'CONTRIBUTION_VERIFIED', amount: 250, runningBalance: 5000 }])),
  http.post('/api/v1/circles/:id/proposals', () => ok({ id: 'p1', title: 'Solar Water Pump', description: 'Install one unit', requestedAmount: 600, status: 'open' }, 201)),
  http.get('/api/v1/circles/:id/proposals', () => ok([{ id: 'p1', title: 'Solar Water Pump', status: 'open', requestedAmount: 600, votingDeadline: new Date().toISOString() }])),
  http.get('/api/v1/circles/:id/proposals/:pid', () => ok({ id: 'p1', title: 'Solar Water Pump', description: 'Install one unit', requestedAmount: 600, status: 'open', votes: { yes: 1, no: 0, abstain: 0, total: 1 }, myVote: null })),
  http.post('/api/v1/circles/:id/proposals/:pid/vote', () => ok({ id: 'v1', vote: 'yes' }, 201)),
  http.post('/api/v1/circles/:id/proposals/:pid/close', () => ok({ id: 'p1', status: 'closed_passed' })),
  http.delete('/api/v1/circles/:id/proposals/:pid', () => ok({ id: 'p1', status: 'cancelled' })),
  http.post('/api/v1/circles/:id/projects', () => ok({ id: 'pr1', proposalId: 'p1', status: 'approved', budget: 600 }, 201)),
  http.get('/api/v1/circles/:id/projects', () => ok([{ id: 'pr1', title: 'Solar Water Pump', status: 'approved', budget: 600 }])),
  http.get('/api/v1/circles/:id/projects/:projId', () => ok({ id: 'pr1', title: 'Solar Water Pump', status: 'approved', budget: 600, proposal: { id: 'p1' } })),
  http.patch('/api/v1/circles/:id/projects/:projId', () => ok({ id: 'pr1', status: 'executing' })),
  http.post('/api/v1/circles/:id/projects/:projId/updates', () => ok({ id: 'u1', content: 'Ground work started', percentComplete: 20 }, 201)),
  http.get('/api/v1/circles/:id/projects/:projId/updates', () => ok([{ id: 'u1', content: 'Ground work started', percentComplete: 20, createdAt: new Date().toISOString() }])),
  http.get('/api/v1/portfolio', () => ok([{ id: 'co1', circleId: 'c1', circleName: 'Mukwano Circle', amount: 250, status: 'verified' }])),
  http.get('/api/v1/portfolio/summary', () =>
    ok({
      totalContributed: 1240,
      totalVerified: 1240,
      inProjects: 800,
      currency: 'USD',
      contributionChangePercent: 12.4,
      attributionNote: 'Verified amounts are allocated across projects in each circle by budget share.',
      bySector: [
        { sector: 'Healthcare', amount: 620, percent: 50 },
        { sector: 'Education', amount: 372, percent: 30 },
        { sector: 'Agriculture', amount: 248, percent: 20 }
      ],
      byCountry: [
        { countryCode: 'UG', label: 'Uganda', amount: 806, percent: 65 },
        { countryCode: 'KE', label: 'Kenya', amount: 434, percent: 35 }
      ],
      timeSeries: [
        { period: '2025-05', amount: 0 },
        { period: '2025-06', amount: 120 },
        { period: '2025-07', amount: 340 },
        { period: '2025-08', amount: 280 }
      ],
      activeProjects: [
        {
          id: 'pr1',
          circleId: 'c1',
          title: 'Kitgum Secondary Lab Fund',
          sector: 'Education',
          countryCode: 'UG',
          budget: 7630,
          amountRaised: 4200,
          percentComplete: 55,
          status: 'executing',
          currency: 'USD'
        }
      ]
    })
  ),
  http.get('/api/v1/dashboard', () => ok({ circles: [], pendingContributions: 2, unvotedProposals: 1, recentActivity: [] })),
  http.get('/api/v1/admin/contributions/pending', () => ok([{ id: 'co1', amount: 250, circleName: 'Mukwano Circle' }])),
  http.get('/api/v1/admin/circles', () => ok([{ id: 'c1', name: 'Mukwano Circle', status: 'active', country: 'Uganda', sector: 'Education' }])),
  http.patch('/api/v1/admin/circles/:id/disable', () => ok({ id: 'c1', status: 'closed' })),
  http.delete('/api/v1/admin/circles/:id', () => ok({ ok: true })),
  http.get('/api/v1/admin/proposals', () => ok([{ id: 'p1', circleId: 'c1', title: 'Solar Water Pump', status: 'open', createdAt: new Date().toISOString() }])),
  http.patch('/api/v1/admin/proposals/:id/disable', () => ok({ id: 'p1', status: 'cancelled' })),
  http.delete('/api/v1/admin/proposals/:id', () => ok({ ok: true })),
  http.get('/api/v1/admin/members', () => ok([{ id: 'u1', email: 'creator@example.com', displayName: 'Creator', isGlobalAdmin: true }])),
  http.patch('/api/v1/admin/members/:id/role', () => ok({ id: 'u2', isGlobalAdmin: true })),
  http.get('/api/v1/admin/ledger', () => ok([{ id: 'l1', type: 'CONTRIBUTION_VERIFIED', amount: 250, circleName: 'Mukwano Circle' }])),
  http.get('/api/v1/admin/activity', () => ok([{ id: 'a1', type: 'PROJECT_STATUS_CHANGED', metadata: { projectId: 'pr1' }, createdAt: new Date().toISOString() }]))
]
