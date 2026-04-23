# Admin platform, RBAC, analytics, and support

## Roles model

| Layer | Values | Storage |
|--------|--------|---------|
| Platform | `USER`, `GLOBAL_ADMIN` | `users.platformRole` (+ legacy `users.isGlobalAdmin`, kept in sync) |
| Circle | `member`, `contributor`, `creator`, `admin` | `circle_memberships.role` |

**Rules**

- Only a user with `GLOBAL_ADMIN` (verified on each request against the database) may call `/admin/*` routes (Fastify `authGuard` + `requireGlobalAdmin`).
- Only the **circle creator** may grant or revoke the circle **`admin`** membership role (mitigates privilege escalation where a circle admin could appoint allies).
- Only `GLOBAL_ADMIN` may grant or revoke **platform** `GLOBAL_ADMIN` (`PATCH /admin/members/:id/role`). The last global admin cannot be removed (`LAST_GLOBAL_ADMIN`).

JWT includes `isGlobalAdmin` and `platformRole` for UI hints; **authoritative checks use the database** in `requireGlobalAdmin` and service-layer `ensureGlobalAdmin`.

## Example API shapes

### `GET /api/v1/admin/analytics/user-growth?months=12`

```json
{
  "series": [
    { "period": "2025-04", "count": 12 },
    { "period": "2025-05", "count": 18 }
  ]
}
```

### `GET /api/v1/admin/analytics/contributions-timeseries?months=12`

```json
{
  "currency": "USD",
  "series": [{ "period": "2025-04", "amount": 15420.5 }]
}
```

### `GET /api/v1/admin/analytics/proposals-summary`

```json
{
  "byStatus": [
    { "status": "closed_passed", "count": 4 },
    { "status": "closed_failed", "count": 1 },
    { "status": "cancelled", "count": 1 }
  ],
  "passed": 4,
  "failed": 2,
  "successRatePercent": 66.7
}
```

### `GET /api/v1/admin/analytics/treasury-trends?months=12`

```json
{
  "currency": "USD",
  "series": [{ "period": "2025-04", "netAmount": 8200 }]
}
```

### `POST /api/v1/support/flags` (authenticated user)

Request:

```json
{
  "reason": "Unable to verify wallet transfer",
  "subjectUserId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response `201`: created `SupportFlag` row with reporter inferred from JWT.

### `GET /api/v1/admin/support/flags` / `PATCH /api/v1/admin/support/flags/:id`

Global admin only. PATCH body: `{ "status": "triaged" }` (`open` | `triaged` | `closed`).

## Audit log

`audit_logs` is append-only from application code. New optional `subjectUserId` links the affected user when relevant (e.g. `GLOBAL_ADMIN_TOGGLED`, `MEMBER_ROLE_UPDATED`).

## Scalability and next steps

- **Analytics**: Current endpoints use bounded `months` (max 36) and SQL `date_trunc` aggregations. For very large tables, add **materialized views** or a **warehouse** (BigQuery, etc.) and cache responses (Redis) with short TTL.
- **Audit**: Partition `audit_logs` by month on PostgreSQL; ship to immutable object storage for compliance.
- **Support**: Replace `SupportFlag` with a ticket table (assignee, SLA, comments) when volume grows.
- **RBAC**: Introduce explicit `Role` + `Permission` tables if fine-grained product roles are needed beyond global vs circle.

## Security notes

- Admin routes no longer rely solely on service-internal checks: **`requireGlobalAdmin`** runs on the Fastify pipeline for every `/admin/*` route (except portfolio/dashboard which stay user-scoped).
- **No client-side authorization** for admin actions: UI gating is UX only; the API enforces roles.
- **Circle admin elevation** is restricted to creators for the `admin` role to reduce lateral movement inside a circle.
