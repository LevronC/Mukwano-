# Mukwano — v1 Requirements

## v1 Requirements

### Authentication & User Management

- [ ] **AUTH-01**: User can create an account with email and password
- [ ] **AUTH-02**: User can log in and receive a JWT access token (15 min) + refresh token (30 days)
- [ ] **AUTH-03**: User can exchange a valid refresh token for a new access token (token rotation)
- [ ] **AUTH-04**: User can log out, revoking their refresh token
- [ ] **AUTH-05**: User can view and update their profile (display name, country, sector)
- [ ] **AUTH-06**: System detects refresh token reuse and revokes the entire token family
- [ ] **AUTH-07**: Global admin flag is stored per user and included in JWT payload

### Circles & Governance

- [ ] **CIRCLE-01**: Authenticated user can create a Circle with name, description, goal amount, and governance config
- [ ] **CIRCLE-02**: Any authenticated user can view the public list of Circles
- [ ] **CIRCLE-03**: Member can view Circle overview including governance configuration
- [ ] **CIRCLE-04**: Circle creator/admin can update Circle details
- [ ] **CIRCLE-05**: Circle admin can soft-close a Circle (status = closed)
- [ ] **CIRCLE-06**: Authenticated user can join a Circle as a member
- [ ] **CIRCLE-07**: Member can leave a Circle
- [ ] **CIRCLE-08**: Admin can view Circle member list with roles
- [ ] **CIRCLE-09**: Admin can change a member's role within a Circle
- [ ] **GOV-01**: Each Circle has exactly one GovernanceConfig (min_contribution, voting_model, quorum_percent, approval_percent, proposal_duration_days, who_can_propose, require_proof)
- [ ] **GOV-02**: System enforces governance rules server-side (who can propose, who can vote, quorum)

### Contributions & Ledger

- [ ] **CONTRIB-01**: Member can submit a contribution (amount, optional note) to a Circle
- [ ] **CONTRIB-02**: Submitted contributions start in pending status; treasury balance does not change
- [ ] **CONTRIB-03**: Member can upload a proof document for a contribution (presigned URL flow, two-step)
- [ ] **CONTRIB-04**: Admin can verify a pending contribution (triggers ledger write atomically)
- [ ] **CONTRIB-05**: Admin can reject a pending contribution with a required reason
- [ ] **CONTRIB-06**: Verifying a contribution auto-promotes member → contributor role atomically
- [ ] **CONTRIB-07**: Admin cannot re-verify an already-verified contribution (idempotency — 409)
- [ ] **CONTRIB-08**: Admin and creator can view all contributions filtered by status
- [ ] **LEDGER-01**: Every treasury event is recorded as an append-only LedgerEntry (INSERT only, never UPDATE/DELETE)
- [ ] **LEDGER-02**: LedgerEntry stores running_balance computed atomically (SELECT FOR UPDATE on last entry)
- [ ] **LEDGER-03**: DB trigger raises exception on any UPDATE or DELETE to ledger_entries
- [ ] **LEDGER-04**: Circle treasury balance is readable in O(1) from last ledger entry's running_balance
- [ ] **LEDGER-05**: Admin and creator can view paginated ledger entries for their Circle

### Proposals & Voting

- [ ] **PROP-01**: Contributor (or configured role) can create a proposal with title, description, requested amount, and auto-set voting deadline
- [ ] **PROP-02**: Member can view list of proposals in a Circle
- [ ] **PROP-03**: Member can view proposal detail including vote summary
- [ ] **PROP-04**: Eligible member can cast a vote (yes/no/abstain) on an open proposal
- [ ] **PROP-05**: System enforces one vote per user per proposal (DB UNIQUE constraint — 409 on duplicate)
- [ ] **PROP-06**: Admin or proposer can cancel an open proposal
- [ ] **PROP-07**: System closes proposals after deadline and evaluates quorum + approval percent
- [ ] **PROP-08**: Closed proposals are marked closed_passed or closed_failed (no further votes accepted)

### Projects

- [ ] **PROJ-01**: Admin can create a Project from a closed_passed proposal
- [ ] **PROJ-02**: Admin can transition project status (approved → executing → complete → cancelled)
- [ ] **PROJ-03**: Transitioning to executing writes a PROJECT_FUNDED ledger entry (negative amount — debit)
- [ ] **PROJ-04**: System rejects project execution if treasury balance < project budget (INSUFFICIENT_TREASURY — 422)
- [ ] **PROJ-05**: Admin or creator can post progress updates on an executing project
- [ ] **PROJ-06**: Members can view project detail and progress updates

### Portfolio & Dashboard

- [ ] **PORT-01**: User can view their personal portfolio (contributions across all Circles with status)
- [ ] **PORT-02**: User can view portfolio summary totals (amount contributed, verified, in projects)
- [ ] **DASH-01**: User can view dashboard with: their Circles, pending action counts, unvoted proposals, recent activity
- [ ] **DASH-02**: Activity feed shows last 20 events across all Circles the user belongs to

### Admin Panel

- [ ] **ADMIN-01**: Global admin can view all pending contributions across all Circles
- [ ] **ADMIN-02**: Global admin can view all users and manage global admin flag
- [ ] **ADMIN-03**: Global admin can view the full activity log
- [ ] **ADMIN-04**: Global admin can view the global ledger

### File Storage (Proofs)

- [ ] **FILE-01**: System generates a presigned PUT URL for proof document upload (S3 or local disk in DEMO_MODE)
- [ ] **FILE-02**: User confirms upload with POST /confirm endpoint, creating a proof_documents record
- [ ] **FILE-03**: Only the contribution owner can upload proofs
- [ ] **FILE-04**: Only admins can retrieve presigned GET URLs for viewing proofs
- [ ] **FILE-05**: File size limit enforced (10 MB), allowed MIME types enforced (jpeg, png, pdf)

### DEMO_MODE & Config

- [ ] **DEMO-01**: GET /api/v1/config returns demoMode flag, currency, and escrow label
- [ ] **DEMO-02**: In DEMO_MODE, treasury credit is a ledger write only (no real bank rail)
- [ ] **DEMO-03**: In DEMO_MODE, file uploads use local disk; email notifications log to console
- [ ] **DEMO-04**: Balance labels include "(simulated)" when demoMode is true
- [ ] **DEMO-05**: All governance rules, vote enforcement, and state machines are identical in both modes

### Frontend (React)

- [ ] **FE-01**: Auth screens (login, signup) with JWT session management
- [ ] **FE-02**: Dashboard screen showing treasury signals and action items
- [ ] **FE-03**: Circle list and create screens
- [ ] **FE-04**: Circle detail with tabs: Overview, Contributions, Proposals, Projects
- [ ] **FE-05**: Contribution submission form with proof upload (two-step presigned flow)
- [ ] **FE-06**: Admin verify/reject contribution workflow in UI
- [ ] **FE-07**: Proposal create and vote screens with one-vote enforcement in UI
- [ ] **FE-08**: Project lifecycle and progress update screens
- [ ] **FE-09**: Personal portfolio screen
- [ ] **FE-10**: Admin panel screens (global ledger, user management, pending contributions)
- [ ] **FE-11**: DEMO_MODE persistent banner when demoMode = true
- [ ] **FE-12**: Consistent error display matching API error format

## v2 Requirements (Deferred)

- Real bank transfer integration (Stripe Connect or similar)
- Multi-sig wallet / DAO treasury adapter
- WebSocket real-time updates
- Email delivery provider (SendGrid, Postmark)
- OAuth login (Google, GitHub)
- Mobile native apps
- KYC / AML compliance flows
- Multi-currency support
- Cross-circle federation

## Out of Scope (MVP)

- On-chain smart contracts — DAO upgrade path is designed (EscrowAdapter) but not wired
- Real-time WebSocket — polling is fine for MVP
- Email delivery — console logging only in DEMO_MODE
- KYC / AML — out of scope
- Mobile apps — web only
- Multi-currency — single USD for MVP

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 — Foundation & Auth | Pending |
| AUTH-02 | Phase 1 — Foundation & Auth | Pending |
| AUTH-03 | Phase 1 — Foundation & Auth | Pending |
| AUTH-04 | Phase 1 — Foundation & Auth | Pending |
| AUTH-05 | Phase 1 — Foundation & Auth | Pending |
| AUTH-06 | Phase 1 — Foundation & Auth | Pending |
| AUTH-07 | Phase 1 — Foundation & Auth | Pending |
| DEMO-01 | Phase 1 — Foundation & Auth | Pending |
| CIRCLE-01 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-02 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-03 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-04 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-05 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-06 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-07 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-08 | Phase 2 — Circles & Membership | Pending |
| CIRCLE-09 | Phase 2 — Circles & Membership | Pending |
| GOV-01 | Phase 2 — Circles & Membership | Pending |
| GOV-02 | Phase 2 — Circles & Membership | Pending |
| CONTRIB-01 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-02 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-03 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-04 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-05 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-06 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-07 | Phase 3 — Contributions & Ledger | Pending |
| CONTRIB-08 | Phase 3 — Contributions & Ledger | Pending |
| LEDGER-01 | Phase 3 — Contributions & Ledger | Pending |
| LEDGER-02 | Phase 3 — Contributions & Ledger | Pending |
| LEDGER-03 | Phase 3 — Contributions & Ledger | Pending |
| LEDGER-04 | Phase 3 — Contributions & Ledger | Pending |
| LEDGER-05 | Phase 3 — Contributions & Ledger | Pending |
| FILE-01 | Phase 3 — Contributions & Ledger | Pending |
| FILE-02 | Phase 3 — Contributions & Ledger | Pending |
| FILE-03 | Phase 3 — Contributions & Ledger | Pending |
| FILE-04 | Phase 3 — Contributions & Ledger | Pending |
| FILE-05 | Phase 3 — Contributions & Ledger | Pending |
| PROP-01 | Phase 4 — Proposals & Voting | Pending |
| PROP-02 | Phase 4 — Proposals & Voting | Pending |
| PROP-03 | Phase 4 — Proposals & Voting | Pending |
| PROP-04 | Phase 4 — Proposals & Voting | Pending |
| PROP-05 | Phase 4 — Proposals & Voting | Pending |
| PROP-06 | Phase 4 — Proposals & Voting | Pending |
| PROP-07 | Phase 4 — Proposals & Voting | Pending |
| PROP-08 | Phase 4 — Proposals & Voting | Pending |
| PROJ-01 | Phase 5 — Projects | Pending |
| PROJ-02 | Phase 5 — Projects | Pending |
| PROJ-03 | Phase 5 — Projects | Pending |
| PROJ-04 | Phase 5 — Projects | Pending |
| PROJ-05 | Phase 5 — Projects | Pending |
| PROJ-06 | Phase 5 — Projects | Pending |
| PORT-01 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| PORT-02 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| DASH-01 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| DASH-02 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| ADMIN-01 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| ADMIN-02 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| ADMIN-03 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| ADMIN-04 | Phase 6 — Portfolio, Dashboard & Admin | Pending |
| DEMO-02 | Phase 7 — DEMO_MODE & Config | Pending |
| DEMO-03 | Phase 7 — DEMO_MODE & Config | Pending |
| DEMO-04 | Phase 7 — DEMO_MODE & Config | Pending |
| DEMO-05 | Phase 7 — DEMO_MODE & Config | Pending |
| FE-01 | Phase 8 — Frontend | Pending |
| FE-02 | Phase 8 — Frontend | Pending |
| FE-03 | Phase 8 — Frontend | Pending |
| FE-04 | Phase 8 — Frontend | Pending |
| FE-05 | Phase 8 — Frontend | Pending |
| FE-06 | Phase 8 — Frontend | Pending |
| FE-07 | Phase 8 — Frontend | Pending |
| FE-08 | Phase 8 — Frontend | Pending |
| FE-09 | Phase 8 — Frontend | Pending |
| FE-10 | Phase 8 — Frontend | Pending |
| FE-11 | Phase 8 — Frontend | Pending |
| FE-12 | Phase 8 — Frontend | Pending |
