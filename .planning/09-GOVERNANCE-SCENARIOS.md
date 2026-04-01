# Governance & Ledger Scenarios

_Last updated: 2026-03-31. Routes use the live API prefix **`/api/v1`**. Automated coverage: `packages/api/test/governance/governance-scenarios.test.ts`._

---

## Ground rules (what "governance" means here)

1. **The server is the source of truth.** UI can hide buttons; only the API enforces rules.
2. **The ledger is append-only.** No UPDATE or DELETE on contribution/balance rows — ever.
3. **Vote tallies are server-computed.** The UI displays; it never calculates.
4. **Role checks happen on every request.** Not just on page load.

---

## Scenarios

### AUTH

**S-01 — Unauthenticated user cannot access protected routes**

- Request: Any `GET /api/v1/circles`, `POST /api/v1/circles/:id/contributions`, etc. without a valid JWT
- Expected: `401 Unauthorized` (`error.code`: `UNAUTHORIZED`)
- UI expectation: Redirect to `/login`; no data leaked in response body
- Test status: `[x]` automated — `governance-scenarios.test.ts`

**S-02 — Expired token is rejected, not silently accepted**

- Request: Request with a JWT past its `exp` claim
- Expected: `401` with `error.code: TOKEN_EXPIRED` (distinct from generic `UNAUTHORIZED`)
- UI expectation: Toast or redirect — not a blank screen or infinite spinner
- Test status: `[x]` automated — `governance-scenarios.test.ts` + `auth-guard.ts` maps `FST_JWT_AUTHORIZATION_TOKEN_EXPIRED`

**S-03 — User cannot escalate their own role**

- Request: `PATCH /api/v1/admin/members/:id/role` with `{ "isGlobalAdmin": true }` from a non–global-admin token (there is no `role` field on `PATCH /api/v1/auth/me`)
- Expected: `403 Forbidden` (`GLOBAL_ADMIN_REQUIRED`)
- UI expectation: No admin APIs exposed to non-admins; API still enforces if called directly
- Test status: `[x]` automated — `governance-scenarios.test.ts`

---

### CIRCLES

**S-04 — Non-member cannot submit a contribution to a circle**

- Request: `POST /api/v1/circles/:id/contributions` from a user who is not a member
- Expected: `403 Forbidden` (`NOT_A_MEMBER`)
- UI expectation: Contribute action hidden; direct API call still blocked
- Test status: `[x]` automated — `governance-scenarios.test.ts`

**S-05 — Join request requires approval before membership is granted**

- Flow: `POST /api/v1/circles/:id/join-request` (pending) → attempt contribution before approval
- Expected: `403` until an admin approves (`MEMBERSHIP_PENDING_APPROVAL` on circle detail when applicable)
- UI expectation: "Pending approval" state; contribute disabled
- Test status: `[ ] manual` first (optional follow-up: automate with join-request + approve endpoints)

---

### LEDGER / CONTRIBUTIONS

**S-06 — Contribution balance cannot be mutated after creation**

- Request: `PUT` or `PATCH` on an existing contribution row attempting to change the amount
- Expected: No such route; immutability via API design + append-only ledger writes on verify
- DB-level: No tracked migration adds an `ledger_entries` UPDATE/DELETE trigger; enforcement is application-layer and transactional INSERT for new ledger rows only
- Test status: `[ ] manual` / API smoke (no mutating endpoint)

**S-07 — Only circle admin/creator can verify or reject a contribution**

- Request: `PATCH /api/v1/circles/:id/contributions/:cid/verify` from a regular **member** (not creator/admin)
- Expected: `403 Forbidden` (`INSUFFICIENT_ROLE`)
- UI expectation: Verify/reject only in admin view; endpoint enforces regardless
- Test status: `[x]` automated — `governance-scenarios.test.ts`

**S-08 — Rejecting a contribution does not delete the ledger row**

- Request: Admin rejects a pending contribution
- Expected: Contribution `status` → `rejected`; row retained; amount unchanged
- UI expectation: Rejected items visible in history with status
- Test status: `[ ] manual` (row count / status assertions in DB or API list)

---

### PROPOSALS & VOTES

**S-09 — Vote tally is server-computed; client cannot affect counts**

- Request: `POST /api/v1/circles/:id/proposals/:pid/vote` with body `{ "vote": "yes", "tally": 99 }`
- Expected: Fastify’s default Ajv uses `removeAdditional: true`, so `tally` is **stripped** before validation; only `vote` is persisted. `GET` proposal `voteSummary` is computed from stored votes (e.g. `cast: 1`, `yes: 1`), never from a client-supplied tally.
- Test status: `[x]` automated — `governance-scenarios.test.ts`

**S-10 — A user cannot vote twice on the same proposal**

- Request: Same user calls vote twice
- Expected: `409 Conflict` (`DUPLICATE_VOTE`) on second request
- Test status: `[x]` automated — `governance-scenarios.test.ts` (also covered in `test/proposals/proposals.test.ts`)

---

## Prioritization for API test implementation

1. S-07 — admin-only verify
2. S-04 — non-member contribution
3. S-10 — double vote
4. S-01 — unauthenticated
5. S-09 — schema + server tally
6. S-03 — global admin escalation
7. S-02 — expired token
8. S-05, S-06, S-08 — manual or follow-up automation

---

## Resolved notes (open questions)

| Topic | Resolution |
|--------|------------|
| Ledger DB trigger | No `ledger_entries` immutability trigger in repo migrations; ledger rows are created in transactions; do not expose UPDATE/DELETE for ledger via API. |
| `DEMO_MODE` | Global app flag (simulated escrow/storage); does not bypass governance or membership rules. |
| Token lifetime / refresh | Access JWT: **15m** (`plugins/jwt.ts`). Refresh tokens and rotation: **auth** routes (`/api/v1/auth/refresh`, family rotation in `AuthService`). |

---

_Update this file when adding scenarios or changing routes._
