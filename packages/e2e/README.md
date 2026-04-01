# Mukwano E2E (Playwright)

Covers **D1** (login page renders), **D2** (API-seeded user → login → dashboard), and **`critical-stories.spec.ts`** (plan §2: signup → onboarding → dashboard → logout/login → create circle → explore) from `08-PLAN-08-depth-production-readiness.md`.

## Which directory am I in?

Paths like `cd packages/e2e` are written for the **repository root** (prompt usually shows `MUKWANO %`).

If your shell prompt already ends with **`e2e %`**, you are **inside** `packages/e2e`. Do **not** run `cd packages/e2e` again — that looks for `packages/e2e/packages/e2e` and fails with `no such file or directory`. From here run:

```bash
npx playwright test tests/critical-stories.spec.ts
# or
npm run test:critical
```

## Prerequisites

- Database reachable with the same `DATABASE_URL` / JWT secrets as `packages/api` (see `packages/api/.env` or docker-compose).
- API and web **built**: `npm run build` in `packages/api` and `packages/web`.

## One-time browser install

**From repo root:**

```bash
npm -w @mukwano/e2e exec playwright install chromium
```

**From `packages/e2e`:**

```bash
npm run playwright:install
```

On Linux CI, use `npx playwright install chromium --with-deps` (see `.github/workflows/e2e.yml`).

## Run locally

**From repo root** (after `npm run build:all`):

```bash
npm run test:e2e              # all Playwright tests
npm run test:e2e:critical     # only critical-stories.spec.ts
```

Playwright starts `node packages/api/dist/server.js` and `vite preview` on **`http://localhost:5173`** unless servers are already up (`reuseExistingServer` when `CI` is unset).

**Global setup** registers a throwaway user via `POST /api/v1/auth/signup` and writes `packages/e2e/.e2e-credentials.json` (gitignored).

### Use your own running servers

Terminal 1 — API (repo root or `packages/api`):

```bash
npm run dev:api
```

Terminal 2 — web:

```bash
npm run dev:web
```

Terminal 3 — tests **from `packages/e2e`**:

```bash
E2E_SKIP_SERVERS=1 npx playwright test
```

With `E2E_SKIP_SERVERS`, ensure `global-setup` can reach the API (`E2E_API_URL`, default `http://localhost:4000`).
