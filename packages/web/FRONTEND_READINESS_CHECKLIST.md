# Mukwano Frontend Readiness Checklist

Use this checklist before calling the frontend "fully polished" against the current backend.

## API Contract Integrity

- [ ] All mutating admin actions use `/api/v1/admin/*` endpoints.
- [ ] No frontend path uses undefined backend routes.
- [ ] Circle governance updates use `/api/v1/circles/:id/governance`.
- [ ] Role-based UI actions are backed by `/api/v1/circles/:id/permissions`.

## Critical Flow Coverage

- [ ] Signup and login complete successfully and hydrate `/auth/me`.
- [ ] Onboarding path includes sector, country, and completion confirmation.
- [ ] Contribution verification and rejection are executable from admin UI.
- [ ] Circle detail lifecycle supports contributions, proposals, and projects.

## UX Resilience

- [ ] Dashboard, Explore, Portfolio, and Admin pages have loading states.
- [ ] Dashboard, Explore, Portfolio, and Admin pages have API error states.
- [ ] Empty-state UX exists for circles, contributions, and portfolio history.
- [ ] Forbidden/unauthorized routes redirect safely without blank screens.

## Governance and Trust Signals

- [ ] Demo mode and escrow labels are consistent with backend config.
- [ ] Admin activity and ledger pages render structured data (not raw JSON blobs).
- [ ] Governance settings are editable only by authorized roles.
- [ ] All treasury-impacting operations remain server-authoritative.

## Production Hardening

- [ ] Placeholder adapters (storage/escrow/notifications) are replaced for non-demo.
- [ ] Audit export/report workflows are connected to real backend endpoints.
- [ ] Monitoring/health endpoint data is surfaced and validated in admin.
- [ ] End-to-end smoke test passes for auth -> onboarding -> contribution -> admin verification.
