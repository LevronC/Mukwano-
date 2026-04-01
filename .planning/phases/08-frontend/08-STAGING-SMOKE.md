# Staging smoke checklist (~15 min)

Run after each release candidate on the **staging** environment (same env **shape** as production: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DEMO_MODE`, `CORS_ORIGIN` pointing at the staging web origin).

Record pass/fail and who ran it in your release notes or ticket.

## Preconditions

- [ ] Web app URL loads over HTTPS (or agreed URL).
- [ ] `GET /api/v1/config` returns expected `demoMode` / labels.
- [ ] No deployment in progress.

## Flows (mirror critical stories)

1. **Auth**
   - [ ] Sign up new user → lands in onboarding or dashboard per product rules.
   - [ ] Log out → log in → reaches dashboard without hard refresh.

2. **Circles**
   - [ ] Create circle → appears in list / dashboard.
   - [ ] Open circle detail → tabs load (overview, contributions, proposals, projects).

3. **Contributions**
   - [ ] Submit contribution (member) → shows pending.
   - [ ] As circle admin/creator: verify or reject → UI reflects new status / treasury updates after refresh.

4. **Proposals**
   - [ ] Create proposal (where allowed) → vote as member → tallies match server (no client math).
   - [ ] Second vote same user → error surfaced (409).

5. **Explore / portfolio**
   - [ ] Explore lists circles; portfolio loads for user with activity.

6. **Global admin** (if account exists)
   - [ ] `/admin` loads pending queue; no raw JSON errors.

## Failure protocol

- Capture **browser network** failing request (status + `error.code` body).
- Check API logs for same timestamp.
- Open ticket with repro steps; do not promote to production.

*See also: automated E2E `.github/workflows/e2e.yml` (D1/D2) and API governance tests `packages/api/test/governance/`.*
