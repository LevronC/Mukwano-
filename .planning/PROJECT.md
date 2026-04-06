# Mukwano

## What This Is

Mukwano ("friend" in Luganda) is a governance-first platform for diaspora communities to pool money collectively toward projects in their home countries. Members form Circles, submit contributions, vote on proposals, and execute funded projects — all with server-enforced rules so no single person can override governance in the UI. The MVP uses simulated funds (DEMO_MODE) but real accounting logic.

## Core Value

Governance enforced in the server layer, not the UI — every balance mutation, vote count, and permission check happens in the API, making the system trustworthy by construction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User authentication with JWT sessions and refresh token rotation
- [ ] Circle creation with configurable governance rules
- [ ] Contribution submission with pending → verified state machine
- [ ] Admin verification of contributions and proof documents
- [ ] Append-only ledger recording every treasury event
- [ ] Proposal creation and one-vote-per-user-per-proposal enforcement
- [ ] Project lifecycle (proposed → approved → executing → complete)
- [ ] Personal portfolio view derived from contributions and project status
- [ ] Dashboard aggregating treasury signals and action items
- [ ] Role system: member, contributor, creator, admin (per circle) + global admin
- [ ] File upload for contribution proof documents (presigned URL flow)
- [ ] React frontend implementing all the above
- [ ] DEMO_MODE flag — no real bank rails, governance identical to production

### Out of Scope

- Real bank transfers or wallet integration — MVP uses simulated escrow only
- Real-time WebSocket updates — polling is acceptable for MVP
- Multi-currency conversion — single currency (USD) for MVP
- Mobile native apps — web only
- On-chain smart contracts — DAO upgrade path is designed but not implemented
- KYC / AML compliance flows — out of scope for MVP
- Email notification delivery — console logging in DEMO_MODE, no provider wired

## Context

- Full system design exists in `SYSTEM_DESIGN.md` at repo root — 20 sections covering domain model, DB schema, API design, auth, ledger, voting, escrow, and DAO upgrade path
- Demo presentation materials describe the expected user journey
- Architecture validated before implementation: 4 correctness issues identified and resolved (votes.weight column, DB trigger vs RULE for ledger append-only, ON CONFLICT vote handling, proof confirm endpoint)
- Greenfield build — no existing application code

## Constraints

- **Tech stack**: Node.js + Fastify + TypeScript, PostgreSQL 16, Prisma ORM, React + TypeScript frontend
- **Structure**: npm workspaces monorepo (`/api`, `/web`)
- **Auth**: JWT (HS256) with 15-min access tokens + 30-day refresh tokens with family rotation
- **Ledger**: Append-only enforced at app layer (INSERT only) + DB trigger (raises exception on UPDATE/DELETE) + DB user has no UPDATE/DELETE grants on ledger_entries
- **DEMO_MODE**: All governance logic is identical to production; only bank rails differ
- **Security**: All business logic server-side; no balance mutations or vote counting in client

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fastify over Express | TypeScript-native, built-in schema validation, better performance | — Pending |
| Prisma over Knex | Type-safe ORM, DX, auto-generated client — ledger raw queries can be wrapped | — Pending |
| DB trigger for ledger append-only | PostgreSQL CREATE RULE silently ignores violations; trigger RAISES EXCEPTION, making bugs visible | — Pending |
| votes.weight column added | weighted_by_contribution voting model requires per-vote weight storage; schema had this gap | — Pending |
| Proof confirm endpoint explicit | Two-step presigned URL flow requires POST /proof/confirm; was missing from API catalog | — Pending |
| npm workspaces monorepo | Native Node.js, no extra tooling, shared types between api and web | — Pending |
| EscrowAdapter interface | Justified abstraction — DAO upgrade path is a stated goal; swapping adapters requires no domain logic change | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
