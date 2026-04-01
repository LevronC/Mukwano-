# Mukwano — System Design Document

**Version**: 1.0
**Date**: 2026-03-30
**Status**: MVP / Demo-ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Domain Model](#4-domain-model)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Role & Permission System](#8-role--permission-system)
9. [Core Domain Logic](#9-core-domain-logic)
10. [Ledger System](#10-ledger-system)
11. [Treasury & Escrow Model](#11-treasury--escrow-model)
12. [Voting Engine](#12-voting-engine)
13. [Notification & Activity Feed](#13-notification--activity-feed)
14. [File / Proof Storage](#14-file--proof-storage)
15. [DEMO_MODE](#15-demo_mode)
16. [Security Model](#16-security-model)
17. [Infrastructure & Deployment](#17-infrastructure--deployment)
18. [Future DAO Upgrade Path](#18-future-dao-upgrade-path)
19. [Error Handling Strategy](#19-error-handling-strategy)
20. [Glossary](#20-glossary)

---

## 1. Overview

**Mukwano** ("friend" in Luganda) is a governance-first platform for diaspora communities to pool money collectively toward projects in their home countries. The central thesis is:

> Intent is easy. Governance is hard.

Most diaspora pooling fails not because people don't want to give — it fails because there are no rules about who decides, who can move value, and how history is proven. Mukwano enforces those rules in the server layer so no single person can override them in the UI.

### Core principles

| Principle | What it means in code |
|-----------|----------------------|
| **Server-enforced governance** | All balance mutations, vote counts, and permission checks happen in the API — never in the client |
| **Ledger-backed accounting** | Every financial state change is recorded as an append-only ledger entry before it is applied |
| **Simulated but real** | `DEMO_MODE` uses no real bank rails, but all accounting, quorums, and role restrictions behave identically to production |
| **Upgrade-ready rails** | The payment/escrow layer is abstracted behind an interface so DAO wallets or real banking can be swapped in without redesigning the product |

---

## 2. Goals & Non-Goals

### Goals (MVP)

- [x] User authentication with JWT sessions
- [x] Circle creation with configurable governance rules
- [x] Contribution submission with pending → verified state machine
- [x] Admin verification of contributions and proof documents
- [x] Append-only ledger recording every treasury event
- [x] Proposal creation and one-vote-per-user-per-proposal enforcement
- [x] Project lifecycle (proposed → approved → executing → complete)
- [x] Personal portfolio view derived from contributions and project status
- [x] Dashboard aggregating treasury signals and action items
- [x] Role system: member, contributor, creator, admin

### Non-Goals (MVP)

- Real bank transfers or wallet integration
- Real-time WebSocket updates (polling acceptable)
- Multi-currency conversion
- Mobile native apps
- On-chain smart contracts
- KYC / AML compliance flows

### Future goals (DAO upgrade path)

- Replace simulated escrow with multi-sig wallet or smart contract treasury
- Governance-as-code: migrate voting rules to on-chain parameters
- Cross-circle federation and inter-circle lending
- Tokenized membership shares

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  Dashboard  │   │   Circles   │   │  Admin Panel        │   │
│  │  Portfolio  │   │   Proposals │   │  Ledger (read-only) │   │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘   │
│         │                 │                      │              │
│         └─────────────────┴──────────────────────┘             │
│                           │ HTTPS / REST                        │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    API LAYER (Node / Express or similar)        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Auth Service │  │ Circle Svc   │  │ Admin Service         │  │
│  │  JWT issue   │  │ Contrib Svc  │  │ Verify / Moderation   │  │
│  │  refresh     │  │ Proposal Svc │  │ Ledger read           │  │
│  └──────────────┘  │ Voting Svc   │  └───────────────────────┘  │
│                    │ Project Svc  │                             │
│  ┌──────────────┐  │ Portfolio Svc│  ┌───────────────────────┐  │
│  │ Ledger Engine│  └──────────────┘  │ Treasury / Escrow Svc │  │
│  │ append-only  │                    │ (DEMO_MODE adapter)   │  │
│  └──────────────┘                    └───────────────────────┘  │
│                                                                 │
│  Middleware: AuthGuard → PermissionGuard → RateLimit → Logger   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
┌─────────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│  PostgreSQL     │  │  File Store  │  │  Cache       │
│  (primary DB)   │  │  (proofs /   │  │  (sessions / │
│  All relations  │  │   docs)      │  │   counts)    │
│  Ledger table   │  └──────────────┘  └──────────────┘
└─────────────────┘
```

### Request lifecycle

```
Browser Request
    │
    ▼
[HTTPS Termination]
    │
    ▼
[Rate Limiter] ──(exceeded)──► 429
    │
    ▼
[AuthGuard]  ──(no/bad JWT)──► 401
    │
    ▼
[PermissionGuard] ──(wrong role)──► 403
    │
    ▼
[Route Handler]
    │
    ├── [Read path] ──► DB query ──► JSON response
    │
    └── [Write path]
            │
            ▼
        [Begin DB Transaction]
            │
            ├── Validate domain rules
            ├── Write ledger entry (append-only)
            ├── Apply state change
            └── Commit
            │
            ▼
        JSON response
```

---

## 4. Domain Model

```
User
 ├── has many CircleMemberships (role per circle)
 ├── has many Contributions
 ├── has many Votes
 └── has one Portfolio (derived)

Circle
 ├── has one GovernanceConfig
 ├── has many CircleMemberships
 ├── has many Contributions
 ├── has many Proposals
 ├── has many Projects
 └── has one Treasury (derived from Ledger)

Contribution
 ├── belongs to User
 ├── belongs to Circle
 ├── has many ProofDocuments
 └── has one LedgerEntry (on verify)

Proposal
 ├── belongs to Circle
 ├── belongs to User (proposer)
 ├── has many Votes
 └── may become a Project (on pass)

Vote
 ├── belongs to Proposal
 └── belongs to User
     (unique constraint: one vote per user per proposal)

Project
 ├── belongs to Circle
 ├── belongs to Proposal (origin)
 └── has many ProgressUpdates

LedgerEntry  (append-only, never updated)
 ├── belongs to Circle
 ├── belongs to User (actor)
 ├── type: CONTRIBUTION_VERIFIED | PROJECT_FUNDED | FEE | REFUND | ...
 ├── amount (positive = credit, negative = debit)
 └── metadata JSON (immutable snapshot)
```

---

## 5. Database Schema

### users

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    country       TEXT,
    sector        TEXT,
    avatar_url    TEXT,
    is_global_admin BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### circles

```sql
CREATE TABLE circles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    goal_amount     NUMERIC(18,2) NOT NULL,
    currency        TEXT DEFAULT 'USD',
    status          TEXT DEFAULT 'active',  -- active | paused | closed
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### governance_configs

```sql
CREATE TABLE governance_configs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id             UUID UNIQUE REFERENCES circles(id) ON DELETE CASCADE,
    min_contribution      NUMERIC(18,2) DEFAULT 0,
    voting_model          TEXT DEFAULT 'one_member_one_vote',
                          -- one_member_one_vote | weighted_by_contribution | quadratic
    quorum_percent        INT DEFAULT 51,   -- % of eligible voters required
    approval_percent      INT DEFAULT 51,   -- % of cast votes required to pass
    proposal_duration_days INT DEFAULT 7,
    who_can_propose       TEXT DEFAULT 'contributor',
                          -- member | contributor | creator | admin
    require_proof         BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### circle_memberships

```sql
CREATE TABLE circle_memberships (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id  UUID REFERENCES circles(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT DEFAULT 'member',  -- member | contributor | creator | admin
    joined_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (circle_id, user_id)
);

CREATE INDEX idx_memberships_circle ON circle_memberships(circle_id);
CREATE INDEX idx_memberships_user   ON circle_memberships(user_id);
```

### contributions

```sql
CREATE TABLE contributions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id      UUID REFERENCES circles(id),
    user_id        UUID REFERENCES users(id),
    amount         NUMERIC(18,2) NOT NULL,
    currency       TEXT DEFAULT 'USD',
    status         TEXT DEFAULT 'pending',
                   -- pending | verified | rejected | refunded
    note           TEXT,
    submitted_at   TIMESTAMPTZ DEFAULT NOW(),
    verified_at    TIMESTAMPTZ,
    verified_by    UUID REFERENCES users(id),
    rejection_reason TEXT,
    ledger_entry_id UUID  -- set on verify; references ledger_entries(id)
);

CREATE INDEX idx_contributions_circle ON contributions(circle_id);
CREATE INDEX idx_contributions_user   ON contributions(user_id);
CREATE INDEX idx_contributions_status ON contributions(status);
```

### proof_documents

```sql
CREATE TABLE proof_documents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id  UUID REFERENCES contributions(id) ON DELETE CASCADE,
    file_key         TEXT NOT NULL,   -- storage key (S3 key or local path)
    file_name        TEXT NOT NULL,
    mime_type        TEXT,
    uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### ledger_entries  ← append-only, never UPDATE or DELETE

```sql
CREATE TABLE ledger_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id    UUID REFERENCES circles(id),
    user_id      UUID REFERENCES users(id),
    entry_type   TEXT NOT NULL,
    -- CONTRIBUTION_VERIFIED | PROJECT_FUNDED | REFUND | FEE | ADJUSTMENT
    amount       NUMERIC(18,2) NOT NULL,
    -- positive = credit to circle treasury
    -- negative = debit from circle treasury
    running_balance NUMERIC(18,2) NOT NULL,  -- balance after this entry
    reference_id    UUID,                   -- contribution_id or project_id
    reference_type  TEXT,                   -- 'contribution' | 'project'
    metadata     JSONB DEFAULT '{}',        -- immutable snapshot at time of entry
    recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce append-only at DB level
CREATE RULE no_update_ledger AS ON UPDATE TO ledger_entries DO INSTEAD NOTHING;
CREATE RULE no_delete_ledger AS ON DELETE TO ledger_entries DO INSTEAD NOTHING;

CREATE INDEX idx_ledger_circle ON ledger_entries(circle_id, recorded_at);
CREATE INDEX idx_ledger_user   ON ledger_entries(user_id);
```

### proposals

```sql
CREATE TABLE proposals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id      UUID REFERENCES circles(id),
    proposed_by    UUID REFERENCES users(id),
    title          TEXT NOT NULL,
    description    TEXT NOT NULL,
    requested_amount NUMERIC(18,2),
    status         TEXT DEFAULT 'open',
    -- open | closed_passed | closed_failed | cancelled | executed
    voting_ends_at TIMESTAMPTZ NOT NULL,
    quorum_met     BOOLEAN DEFAULT FALSE,
    final_yes      INT DEFAULT 0,
    final_no       INT DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    closed_at      TIMESTAMPTZ
);
```

### votes

```sql
CREATE TABLE votes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id  UUID REFERENCES proposals(id),
    user_id      UUID REFERENCES users(id),
    vote         TEXT NOT NULL,  -- 'yes' | 'no' | 'abstain'
    cast_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (proposal_id, user_id)  -- enforces one vote per user per proposal
);
```

### projects

```sql
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id     UUID REFERENCES circles(id),
    proposal_id   UUID REFERENCES proposals(id),
    title         TEXT NOT NULL,
    description   TEXT,
    budget        NUMERIC(18,2),
    status        TEXT DEFAULT 'approved',
    -- approved | executing | complete | cancelled
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### project_progress_updates

```sql
CREATE TABLE project_progress_updates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id),
    posted_by   UUID REFERENCES users(id),
    body        TEXT NOT NULL,
    percent_complete INT DEFAULT 0,
    posted_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### activity_feed

```sql
CREATE TABLE activity_feed (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id   UUID REFERENCES circles(id),
    actor_id    UUID REFERENCES users(id),
    event_type  TEXT NOT NULL,
    -- CONTRIBUTION_SUBMITTED | CONTRIBUTION_VERIFIED | PROPOSAL_CREATED |
    -- VOTE_CAST | PROJECT_STARTED | PROJECT_COMPLETE | MEMBER_JOINED
    payload     JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_circle ON activity_feed(circle_id, created_at DESC);
CREATE INDEX idx_feed_user   ON activity_feed(actor_id);
```

---

## 6. API Design

All endpoints are prefixed `/api/v1`. All responses are JSON. Authentication via `Authorization: Bearer <jwt>`.

### Auth

```
POST   /auth/signup          Create account
POST   /auth/login           Issue JWT pair (access + refresh)
POST   /auth/refresh         Exchange refresh token for new access token
POST   /auth/logout          Revoke refresh token
GET    /auth/me              Current user profile
PATCH  /auth/me              Update profile (name, country, sector)
```

### Circles

```
GET    /circles              List circles (public discovery)
POST   /circles              Create circle (authenticated)
GET    /circles/:id          Circle overview + governance config
PATCH  /circles/:id          Update circle (creator/admin only)
DELETE /circles/:id          Soft-close circle (admin only)

POST   /circles/:id/join     Join as member
DELETE /circles/:id/leave    Leave circle
GET    /circles/:id/members  List members with roles
PATCH  /circles/:id/members/:userId/role   Change member role (admin)
```

### Contributions

```
GET    /circles/:id/contributions        List (filtered by status)
POST   /circles/:id/contributions        Submit contribution (member+)
GET    /circles/:id/contributions/:cid   Detail + proof docs
POST   /circles/:id/contributions/:cid/proof   Upload proof document

-- Admin only --
PATCH  /circles/:id/contributions/:cid/verify   Verify → triggers ledger write
PATCH  /circles/:id/contributions/:cid/reject   Reject with reason
```

### Proposals & Voting

```
GET    /circles/:id/proposals            List proposals
POST   /circles/:id/proposals            Create proposal (contributor+ or per governance config)
GET    /circles/:id/proposals/:pid       Proposal detail + vote summary
DELETE /circles/:id/proposals/:pid       Cancel (proposer or admin, only if open)

POST   /circles/:id/proposals/:pid/vote  Cast vote (one per user; 409 if duplicate)
GET    /circles/:id/proposals/:pid/votes List votes (anonymized or attributed per config)
POST   /circles/:id/proposals/:pid/close Force-close after deadline (cron or manual admin)
```

### Projects

```
GET    /circles/:id/projects             List projects
POST   /circles/:id/projects             Create from passed proposal (admin)
GET    /circles/:id/projects/:projId     Project detail
PATCH  /circles/:id/projects/:projId     Update status (admin)
POST   /circles/:id/projects/:projId/updates  Post progress update
GET    /circles/:id/projects/:projId/updates  List progress updates
```

### Ledger (read-only)

```
GET    /circles/:id/ledger          Paginated ledger entries (admin or member with read perm)
GET    /circles/:id/treasury        Current balance + summary stats
GET    /admin/ledger                Global ledger (global admin only)
```

### Portfolio

```
GET    /portfolio                   My contributions + project outcomes across all circles
GET    /portfolio/summary           Aggregate totals (amount contributed, verified, in projects)
```

### Dashboard

```
GET    /dashboard                   Aggregated: my circles, treasury alerts, pending votes, activity
```

### Admin

```
GET    /admin/contributions/pending  All pending contributions across circles
GET    /admin/members                All users + roles
PATCH  /admin/members/:id/role       Set global admin flag
GET    /admin/activity               Full activity log
```

---

## 7. Authentication & Authorization

### JWT Strategy

```
Access Token
  payload: { sub: userId, email, isGlobalAdmin, iat, exp }
  expiry:  15 minutes
  signed:  HS256 with server secret (or RS256 in production)

Refresh Token
  payload: { sub: userId, tokenFamily, iat, exp }
  expiry:  30 days
  stored:  hashed in DB table `refresh_tokens`
  rotated: on every use (token rotation — old family invalidated on reuse)
```

### Token rotation & refresh_tokens table

```sql
CREATE TABLE refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT UNIQUE NOT NULL,   -- bcrypt of raw token
    family       UUID NOT NULL,          -- revoke entire family on reuse
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Reuse detection**: If an already-used token is presented, the entire token family is revoked (all sessions for that user). This detects token theft.

### Middleware chain

```
AuthGuard
  └── Verify JWT signature
  └── Check exp not past
  └── Attach req.user = { id, email, isGlobalAdmin }

CirclePermissionGuard(requiredRole)
  └── SELECT role FROM circle_memberships WHERE circle_id=:id AND user_id=req.user.id
  └── Compare against role hierarchy: member < contributor < creator < admin
  └── Short-circuit: isGlobalAdmin bypasses circle-level checks
```

---

## 8. Role & Permission System

### Role hierarchy (per circle)

```
GLOBAL_ADMIN  ──► can do anything in any circle
    │
ADMIN         ──► circle admin: verify contributions, moderate, manage roles
    │
CREATOR       ──► created the circle; same as admin + can delete circle
    │
CONTRIBUTOR   ──► verified at least one contribution; can propose + vote
    │
MEMBER        ──► joined circle; can submit contributions, view everything
```

### Permission matrix

| Action | member | contributor | creator | admin | global_admin |
|--------|--------|-------------|---------|-------|--------------|
| View circle | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit contribution | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vote on proposal | — | ✓ | ✓ | ✓ | ✓ |
| Create proposal | per config | ✓ | ✓ | ✓ | ✓ |
| Verify contribution | — | — | — | ✓ | ✓ |
| Reject contribution | — | — | — | ✓ | ✓ |
| View ledger | — | — | ✓ | ✓ | ✓ |
| Change member roles | — | — | — | ✓ | ✓ |
| Execute project | — | — | — | ✓ | ✓ |
| Delete/close circle | — | — | ✓ | — | ✓ |

### Contributor auto-promotion

When a contribution is verified, the API checks:

```
IF user role in circle == 'member' THEN
    UPDATE circle_memberships SET role = 'contributor'
    WHERE circle_id = :circleId AND user_id = :userId
```

This is done atomically inside the same transaction as ledger write.

---

## 9. Core Domain Logic

### 9.1 Contribution State Machine

```
                   submit
[NONE] ──────────────────────► [PENDING]
                                   │
                    admin verify   │   admin reject
                         ┌─────────┤─────────────────────────┐
                         ▼                                   ▼
                   [VERIFIED]                          [REJECTED]
                         │
                         │ (if funded from treasury later)
                         ▼
                   [REFUNDED]  (if project cancelled)
```

**Rules enforced in API:**

- Amount must be > 0
- Circle must be `active`
- User must be a member of the circle
- If `require_proof = true` in governance config: proof document must be uploaded before verification is allowed
- Verification is idempotent: re-verifying an already-verified contribution returns 409
- Rejection must include a reason (stored, visible to contributor)

### 9.2 Proposal State Machine

```
[OPEN]
   │
   ├──► voting_ends_at reached ──► [CLOSED]
   │          │
   │          ├── quorum met & approval_percent reached ──► [CLOSED_PASSED]
   │          └── otherwise ──► [CLOSED_FAILED]
   │
   └──► admin cancel ──► [CANCELLED]

[CLOSED_PASSED]
   │
   └──► admin execute ──► project created ──► [EXECUTED]
```

**Voting eligibility check (per governance config):**

```
who_can_vote = 'contributor' (default)
  → user must have role >= 'contributor' in this circle

voting_model = 'weighted_by_contribution'
  → weight = SUM(amount) of verified contributions by this user in this circle
  → stored in vote.weight column

voting_model = 'quadratic'
  → weight = SQRT(contribution_count) — future
```

### 9.3 Project Lifecycle

```
Proposal passes
    │
    ▼
Admin creates Project from Proposal
    │ status = 'approved'
    ▼
Admin marks executing
    │ status = 'executing'
    │ LedgerEntry: PROJECT_FUNDED (negative amount = debit from treasury)
    ▼
Progress updates posted (by admin or creator)
    │
    ▼
Admin marks complete
    │ status = 'complete'
    └── Activity event: PROJECT_COMPLETE
```

---

## 10. Ledger System

The ledger is the single source of truth for all treasury state. **It is never updated or deleted.**

### Append-only guarantee (three layers)

1. **Application layer**: `LedgerService.append()` only calls `INSERT`. No `UPDATE`/`DELETE` on ledger table.
2. **Database layer**: `CREATE RULE no_update_ledger` / `no_delete_ledger` (see schema).
3. **DB user**: The application DB user has `INSERT`, `SELECT` on `ledger_entries` only — no `UPDATE`, `DELETE` granted.

### Running balance calculation

```sql
-- Treasury balance for a circle
SELECT SUM(amount) AS balance
FROM ledger_entries
WHERE circle_id = :circleId;

-- Or use the last running_balance for O(1) read
SELECT running_balance
FROM ledger_entries
WHERE circle_id = :circleId
ORDER BY recorded_at DESC
LIMIT 1;
```

Running balance is computed at insert time inside a serialized transaction:

```sql
BEGIN;
SELECT running_balance FROM ledger_entries
  WHERE circle_id = :circleId
  ORDER BY recorded_at DESC
  LIMIT 1
  FOR UPDATE;  -- row lock to prevent race

INSERT INTO ledger_entries (..., running_balance)
  VALUES (..., :previousBalance + :amount);

COMMIT;
```

### Entry types and their amounts

| entry_type | amount sign | triggered by |
|------------|-------------|--------------|
| `CONTRIBUTION_VERIFIED` | + (positive) | Admin verifies contribution |
| `PROJECT_FUNDED` | − (negative) | Admin executes project |
| `REFUND` | − (negative) | Admin refunds verified contribution |
| `FEE` | − (negative) | Platform fee (future) |
| `ADJUSTMENT` | ± | Global admin correction (rare, logged) |

---

## 11. Treasury & Escrow Model

In `DEMO_MODE`, Mukwano acts as its own escrow. No real money moves. The simulated treasury is the sum of all verified contributions minus all project disbursements, read from the ledger.

### Escrow interface (abstraction for future swap)

```typescript
interface EscrowAdapter {
  // Called on contribution verify
  creditTreasury(circleId: string, amount: number, contributionId: string): Promise<TxRef>;

  // Called on project execute
  debitTreasury(circleId: string, amount: number, projectId: string): Promise<TxRef>;

  // Called on refund
  refund(circleId: string, amount: number, userId: string): Promise<TxRef>;

  // Current balance
  getBalance(circleId: string): Promise<number>;
}

// Implementations:
class DemoEscrowAdapter implements EscrowAdapter { ... }   // reads ledger, no real bank
class StripeEscrowAdapter implements EscrowAdapter { ... } // future: Stripe Connect
class MultisigWalletAdapter implements EscrowAdapter { ... } // future: DAO
```

The `DemoEscrowAdapter` simply writes to the ledger. Swapping to `StripeEscrowAdapter` requires no changes to domain logic — only the adapter.

---

## 12. Voting Engine

### Vote casting (idempotency + constraint)

```
POST /circles/:id/proposals/:pid/vote
  body: { vote: "yes" | "no" | "abstain" }

1. Verify proposal status = 'open'
2. Verify voting_ends_at > NOW()
3. Verify user is eligible (role check + governance config)
4. INSERT INTO votes (proposal_id, user_id, vote)
   ON CONFLICT (proposal_id, user_id) DO NOTHING
   → returns 409 if already voted
5. Append to activity feed
```

The `UNIQUE (proposal_id, user_id)` constraint in PostgreSQL is the final enforcement — even if application logic is bypassed, the DB rejects duplicate votes.

### Closing a proposal

Run by cron job (or triggered by admin):

```
1. SELECT all votes WHERE proposal_id = :pid
2. eligible_voter_count = members with role >= contributor
3. quorum_met = (cast_votes / eligible_voter_count) >= quorum_percent
4. approval = (yes_votes / cast_votes) >= approval_percent
5. status = quorum_met && approval ? 'closed_passed' : 'closed_failed'
6. UPDATE proposals SET status, quorum_met, final_yes, final_no, closed_at
7. Append activity event
```

---

## 13. Notification & Activity Feed

### Activity events written on every state change

Every service method that changes state also writes to `activity_feed` in the same transaction. This means the feed is always consistent with state — no dual-write failures.

```typescript
// Example in ContributionService.verify():
await db.transaction(async (trx) => {
  await trx('contributions').update({ status: 'verified', verified_at: now, verified_by });
  await LedgerService.append(trx, { type: 'CONTRIBUTION_VERIFIED', ... });
  await ActivityFeedService.append(trx, { event_type: 'CONTRIBUTION_VERIFIED', ... });
  if (userRole === 'member') await MembershipService.promote(trx, userId, circleId, 'contributor');
});
```

### Dashboard aggregation query

```sql
SELECT
  (SELECT COUNT(*) FROM contributions c
    JOIN circle_memberships cm ON cm.circle_id = c.circle_id
    WHERE cm.user_id = :userId AND c.status = 'pending') AS pending_contributions,

  (SELECT COUNT(*) FROM proposals p
    JOIN circle_memberships cm ON cm.circle_id = p.circle_id
    WHERE cm.user_id = :userId
      AND p.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM votes v WHERE v.proposal_id = p.id AND v.user_id = :userId
      )) AS unvoted_proposals,

  (SELECT COALESCE(SUM(le.amount), 0) FROM ledger_entries le
    JOIN circle_memberships cm ON cm.circle_id = le.circle_id
    WHERE cm.user_id = :userId) AS total_treasury_exposure,

  (SELECT json_agg(row_to_json(af)) FROM (
    SELECT * FROM activity_feed
    WHERE circle_id IN (
      SELECT circle_id FROM circle_memberships WHERE user_id = :userId
    )
    ORDER BY created_at DESC LIMIT 20
  ) af) AS recent_activity;
```

---

## 14. File / Proof Storage

### Upload flow

```
1. Client calls POST /circles/:id/contributions/:cid/proof
2. API generates a presigned PUT URL (S3 or local MinIO in dev)
3. Client uploads directly to storage
4. Client confirms with POST /confirm (provides file_key)
5. API creates proof_documents record
6. Admin sees documents on the contribution detail page
```

### Storage key naming

```
proofs/{circleId}/{contributionId}/{timestamp}-{randomSuffix}.{ext}
```

### Security

- Presigned URLs expire in 15 minutes
- Only the contribution owner can upload proofs
- Only admins can view proofs (presigned GET URLs, short-lived)
- File size limit: 10 MB per document, 5 documents per contribution
- Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`

---

## 15. DEMO_MODE

`DEMO_MODE=true` in environment activates:

| Behavior | DEMO_MODE=false (production) | DEMO_MODE=true (demo) |
|----------|------------------------------|-----------------------|
| Treasury credit | Real bank transfer confirmed | Ledger write only |
| Contribution proof | Required, verified manually | Optional (skippable) |
| Email notifications | Sent via provider | Logged to console |
| File uploads | Real S3 | Local disk or mock |
| Balance labels | "$1,250.00 USD" | "$1,250.00 (simulated)" |

All governance rules, vote enforcement, role checks, ledger writes, and state machines are identical in both modes.

Detection in client:

```json
GET /api/v1/config
{
  "demoMode": true,
  "currency": "USD",
  "escrowLabel": "Simulated escrow — no real funds"
}
```

The client renders a persistent banner when `demoMode: true`.

---

## 16. Security Model

### Threat model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized balance mutation | All balance changes go through LedgerService, guarded by PermissionGuard (admin only) |
| Duplicate votes | DB UNIQUE constraint + 409 response on conflict |
| Vote manipulation by admin | Admins have no endpoint to update votes; votes table has no UPDATE permission for app user |
| Ledger tampering | DB rules block UPDATE/DELETE; app user lacks those grants |
| Token theft / session hijack | Refresh token rotation with family revocation; short-lived access tokens |
| IDOR (accessing other users' data) | All queries filter by authenticated userId or circleId + membership check |
| Proof document exposure | Presigned URLs; short-lived; role-gated |
| SQL injection | Parameterized queries only (ORM or query builder) |
| Mass assignment | Explicit field whitelisting in all PATCH handlers |
| Rate limiting | Per-IP and per-user rate limits on all auth endpoints |

### What admins CAN do

- Verify or reject contributions
- View ledger (read-only)
- Change member roles (not their own global admin status)
- Cancel proposals
- Execute passed proposals into projects

### What admins CANNOT do

- Update or delete ledger entries
- Change vote records
- Change final vote tallies on closed proposals
- Access other users' refresh tokens

---

## 17. Infrastructure & Deployment

### Stack choices (MVP)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Component model, easy state |
| Backend | Node.js + Express (or Fastify) | Fast iteration, large ecosystem |
| Database | PostgreSQL 16 | ACID, row-level security, JSONB |
| Cache | Redis (optional) | Session store, rate limit counters |
| File storage | S3 / MinIO | Presigned URL pattern |
| Auth | JWT (HS256) | Stateless, easy to implement |
| ORM / Query | Knex.js or Prisma | Parameterized, schema migration |

### Environment variables

```
DATABASE_URL=postgres://...
JWT_SECRET=<256-bit random>
REFRESH_TOKEN_SECRET=<256-bit random>
DEMO_MODE=true
FILE_STORAGE_PROVIDER=local|s3
S3_BUCKET=mukwano-proofs
S3_REGION=us-east-1
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

### Deployment topology (production-ready path)

```
Internet
    │
[CDN / Edge] ──► Static frontend assets
    │
[Load Balancer]
    │
[API servers] (2+ for HA)
    │
[RDS PostgreSQL] ──► Read replica for dashboard queries
    │
[S3 bucket] ──► Proof documents
    │
[Redis] ──► Session store / rate limit
```

### Database migrations

All schema changes via versioned migration files (Knex migrations or Flyway). Never modify `ledger_entries` schema without a dedicated migration review. Migration checklist:

- [ ] Is this backwards-compatible?
- [ ] Can it be rolled back?
- [ ] Does it touch the ledger? If so, requires additional sign-off.

---

## 18. Future DAO Upgrade Path

The design is intentionally structured so that the governance product does not change — only the financial rails swap.

### What stays the same

- Circle, membership, proposal, voting, project models
- All governance configuration and rule enforcement
- Role and permission system
- Activity feed and portfolio views
- All API contracts (backwards-compatible additions only)

### What gets swapped

| Current | DAO replacement |
|---------|----------------|
| `DemoEscrowAdapter` | `MultisigWalletAdapter` (Gnosis Safe) or `SmartContractAdapter` |
| `ledger_entries` table (off-chain) | On-chain transaction receipts (stored as reference in ledger) |
| JWT sessions | Wallet signature (SIWE — Sign-In with Ethereum) or hybrid |
| Admin verify contributions | Oracle or zk-proof verification |
| Quorum = DB count | On-chain vote tallying |

### Migration strategy

1. Deploy `StripeEscrowAdapter` for real-money MVP (minimal product change)
2. Introduce wallet connect as optional auth (alongside JWT)
3. Add on-chain ledger entries as secondary record (dual-write period)
4. Replace treasury adapter with smart contract
5. Deprecate JWT-only auth; require wallet

This phased approach means users never have to re-learn the product — governance, circles, and voting look identical throughout.

---

## 19. Error Handling Strategy

### API error format (consistent)

```json
{
  "error": {
    "code": "CONTRIBUTION_ALREADY_VERIFIED",
    "message": "This contribution has already been verified.",
    "field": null,
    "status": 409
  }
}
```

### Error code catalog

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | No or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role |
| `NOT_FOUND` | 404 | Resource not found (or not visible) |
| `CONTRIBUTION_ALREADY_VERIFIED` | 409 | Idempotency guard |
| `VOTE_ALREADY_CAST` | 409 | Duplicate vote attempt |
| `PROPOSAL_CLOSED` | 409 | Voting on a non-open proposal |
| `INSUFFICIENT_TREASURY` | 422 | Project budget > available balance |
| `VALIDATION_ERROR` | 422 | Input schema failure (with field) |
| `DEMO_MODE_RESTRICTED` | 503 | Feature not available in demo mode |

### Transaction failure handling

All multi-step writes (verify contribution → ledger → activity → role promotion) run inside a single DB transaction. On any failure, the entire operation rolls back. The client receives a 500 with a generic message; the server logs the full error with correlation ID.

---

## 20. Glossary

| Term | Definition |
|------|-----------|
| **Circle** | A named pooling group with its own governance config, treasury, and members |
| **Contribution** | A member's declared financial input; starts pending, becomes real on verification |
| **Ledger entry** | An immutable, append-only record of a treasury event |
| **Running balance** | The cumulative treasury total stored on each ledger entry for O(1) reads |
| **Governance config** | Per-circle rules: who can vote, quorum %, approval %, who can propose |
| **Quorum** | Minimum percentage of eligible voters who must cast a vote for a result to be valid |
| **Proposal** | A formal request to allocate treasury funds to a project, subject to a vote |
| **Project** | An outcome funded by a passed proposal; has a lifecycle and progress tracking |
| **Portfolio** | A user's personal view of their contributions and project outcomes across all circles |
| **DEMO_MODE** | Runtime flag that disables real bank rails while keeping all governance logic active |
| **Simulated escrow** | The ledger-backed treasury in demo mode — accounting is real, funds are not |
| **Token family** | A group of refresh tokens issued from the same login session; revoked together on reuse |
| **Contributor** | A member whose contribution has been verified; gains voting rights |
| **EscrowAdapter** | Interface abstracting the treasury backend — swappable without changing domain logic |

---

*End of system design — Mukwano v1.0*
