# Mukwano — Roadmap

**Project**: Mukwano — governance-first diaspora community pooling platform
**Milestone**: v1 MVP
**Created**: 2026-03-30
**Granularity**: standard

---

## Phases

- [ ] **Phase 1: Foundation & Auth** — Monorepo scaffolded, DB connected, JWT auth end-to-end
- [ ] **Phase 2: Circles & Membership** — Circles can be created, joined, and governed with role enforcement
- [ ] **Phase 3: Contributions & Ledger** — Contributions flow through pending→verified state machine; every treasury event is ledger-recorded
- [ ] **Phase 4: Proposals & Voting** — Members can propose, vote, and close proposals with quorum enforcement
- [ ] **Phase 5: Projects** — Passed proposals become funded projects with lifecycle tracking
- [ ] **Phase 6: Portfolio, Dashboard & Admin** — All data surfaces as actionable read-only views
- [ ] **Phase 7: DEMO_MODE & Config** — DEMO_MODE is explicit, labeled, and complete — all governance runs identically
- [ ] **Phase 8: Frontend** — React app implements all backend phases with consistent UX

---

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Project is scaffolded, database is connected, and JWT authentication works end-to-end with refresh token rotation
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, DEMO-01
**Success Criteria** (what must be TRUE):
  1. A new user can POST /auth/signup with email and password and receive a 201 response with a user record
  2. A user can POST /auth/login and receive a 15-minute access token and a 30-day refresh token
  3. A user can POST /auth/refresh with a valid refresh token and receive a new access token (old token is invalidated)
  4. Presenting a previously-used refresh token revokes the entire token family (reuse detection returns 401)
  5. GET /api/v1/config returns a JSON body with demoMode, currency, and escrowLabel fields
**Plans**: TBD

### Phase 2: Circles & Membership
**Goal**: Circles can be created, joined, and governed with role enforcement — no action proceeds without a valid role check
**Depends on**: Phase 1
**Requirements**: CIRCLE-01, CIRCLE-02, CIRCLE-03, CIRCLE-04, CIRCLE-05, CIRCLE-06, CIRCLE-07, CIRCLE-08, CIRCLE-09, GOV-01, GOV-02
**Success Criteria** (what must be TRUE):
  1. An authenticated user can create a Circle and is automatically assigned the creator role with a GovernanceConfig row created atomically
  2. Any authenticated user can GET /circles and see the public list; an unauthenticated request returns 401
  3. A member can join and leave a Circle; a non-member cannot view member-restricted endpoints
  4. An admin can change a member's role; a non-admin attempting the same receives 403
  5. Governance rules (who_can_propose, quorum_percent) are readable on GET /circles/:id and are enforced when downstream actions run
**Plans**: TBD

### Phase 3: Contributions & Ledger
**Goal**: Contributions flow through the pending→verified state machine and every treasury event is immutably recorded in the ledger
**Depends on**: Phase 2
**Requirements**: CONTRIB-01, CONTRIB-02, CONTRIB-03, CONTRIB-04, CONTRIB-05, CONTRIB-06, CONTRIB-07, CONTRIB-08, LEDGER-01, LEDGER-02, LEDGER-03, LEDGER-04, LEDGER-05, FILE-01, FILE-02, FILE-03, FILE-04, FILE-05
**Success Criteria** (what must be TRUE):
  1. A member can submit a contribution; it appears with status=pending and the circle treasury balance does not change
  2. An admin verifying a contribution causes a CONTRIBUTION_VERIFIED ledger entry to appear and the treasury running_balance to increase by the contribution amount
  3. Attempting to UPDATE or DELETE a ledger row at the database level raises an exception (trigger fires)
  4. A member can obtain a presigned PUT URL, upload a proof file, and POST /confirm to create a proof_documents record; a non-owner receives 403
  5. Verifying a contribution auto-promotes the contributor from member to contributor role within the same transaction; re-verifying an already-verified contribution returns 409
**Plans**: TBD

### Phase 4: Proposals & Voting
**Goal**: Members can create proposals, cast votes, and proposals close with correct quorum and approval evaluation
**Depends on**: Phase 3
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06, PROP-07, PROP-08
**Success Criteria** (what must be TRUE):
  1. A contributor (or role permitted by governance config) can create a proposal with a title, description, requested amount, and a voting deadline auto-set from governance_config.proposal_duration_days
  2. An eligible member can cast a vote (yes/no/abstain); casting a second vote on the same proposal returns 409
  3. Closing a proposal evaluates quorum: if (votes_cast / eligible_voters) >= quorum_percent AND (yes / cast) >= approval_percent, status becomes closed_passed; otherwise closed_failed
  4. A proposal past its deadline accepts no further votes and returns 409 on vote attempts
  5. An admin or the proposer can cancel an open proposal; cancelled proposals accept no votes
**Plans**: TBD

### Phase 5: Projects
**Goal**: Passed proposals become funded projects and treasury debits are recorded at execution
**Depends on**: Phase 4
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06
**Success Criteria** (what must be TRUE):
  1. An admin can create a Project from a closed_passed proposal; attempting to create from a non-passed proposal returns 422
  2. Transitioning a project to executing writes a PROJECT_FUNDED ledger entry with a negative amount equal to the project budget
  3. Attempting to execute a project when treasury balance < project budget returns 422 with code INSUFFICIENT_TREASURY
  4. Admin or creator can post progress updates on an executing project; members can read them
  5. A completed project is visible in the project list with status=complete and its ledger debit remains immutable
**Plans**: TBD

### Phase 6: Portfolio, Dashboard & Admin
**Goal**: All data surfaces as actionable, read-only views — every user sees their personal standing and every admin sees the global picture
**Depends on**: Phase 5
**Requirements**: PORT-01, PORT-02, DASH-01, DASH-02, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. GET /portfolio returns all of the authenticated user's contributions across every Circle they belong to, with current status on each
  2. GET /portfolio/summary returns aggregate totals: amount contributed, amount verified, amount in executing projects
  3. GET /dashboard returns the user's Circles, count of pending contributions awaiting action, unvoted open proposals, and the last 20 activity feed events
  4. GET /admin/contributions/pending (global admin only) returns all pending contributions across all Circles; a non-admin receives 403
  5. GET /admin/ledger (global admin only) returns the full global ledger; GET /admin/members allows toggling the is_global_admin flag
**Plans**: TBD

### Phase 7: DEMO_MODE & Config
**Goal**: DEMO_MODE is fully wired through every service — no real bank rails are touched, balance labels are honest, and governance is identical to production
**Depends on**: Phase 3
**Requirements**: DEMO-02, DEMO-03, DEMO-04, DEMO-05
**Success Criteria** (what must be TRUE):
  1. With DEMO_MODE=true, verifying a contribution writes a ledger entry but triggers no external bank rail call — the EscrowAdapter in use is DemoEscrowAdapter
  2. File uploads in DEMO_MODE write to local disk; email/notification events are logged to console and no external provider is called
  3. Any treasury balance field in any API response includes "(simulated)" in the label when demoMode=true
  4. All governance operations (quorum evaluation, role checks, vote uniqueness, state machine transitions) behave identically with DEMO_MODE=true and DEMO_MODE=false
**Plans**: TBD

### Phase 8: Frontend
**Goal**: The React app delivers the full user journey — auth, circles, contributions, voting, projects, portfolio, and admin — with consistent error handling and DEMO_MODE awareness
**Depends on**: Phase 7
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09, FE-10, FE-11, FE-12
**Success Criteria** (what must be TRUE):
  1. A new user can complete the full journey (signup → create circle → submit contribution → get verified → create proposal → vote → execute project) without leaving the browser
  2. When demoMode=true is returned by GET /api/v1/config, a persistent banner is visible on every screen in the app
  3. Every API error response is displayed to the user in a consistent format matching the error.code/message shape from §19 of the system design — no raw JSON or stack traces
  4. The Circle detail screen has tabs for Overview, Contributions, Proposals, and Projects — each tab loads the correct data
  5. The two-step presigned upload flow (request URL → upload directly → confirm) works from the contribution form with file type and size validation client-side before the request
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/? | Not started | - |
| 2. Circles & Membership | 0/? | Not started | - |
| 3. Contributions & Ledger | 0/? | Not started | - |
| 4. Proposals & Voting | 0/? | Not started | - |
| 5. Projects | 0/? | Not started | - |
| 6. Portfolio, Dashboard & Admin | 0/? | Not started | - |
| 7. DEMO_MODE & Config | 0/? | Not started | - |
| 8. Frontend | 0/? | Not started | - |
