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

- **`packages/api/.env`** with a valid `DATABASE_URL`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` (same as when you run the API locally). Playwright loads this file before starting `node dist/server.js`.
- **PostgreSQL URL shape:** if you see  
  `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`,  
  your URL almost always needs an explicit password in the URI, e.g.  
  `postgresql://USER:PASSWORD@localhost:5432/DBNAME`  
  (even for local dev, use the real password — not `postgresql://user@host/...` with no `:` segment, which can break SCRAM).
- API **built** (`npm run build:api` from repo root). Web is started with `vite` dev by Playwright (see above).

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

**From repo root** — build the **API** (`packages/api/dist/server.js` is what Playwright starts). The web app is served by Vite dev; you do **not** need `npm run build` in `packages/web` for these tests.

```bash
npm run build:api   # or npm run build:all if you prefer
npm run test:e2e              # all Playwright tests
npm run test:e2e:critical     # only critical-stories.spec.ts
```

Playwright starts `node packages/api/dist/server.js` and **`npm run dev`** (Vite dev server) on **`http://localhost:5173`** unless servers are already up (`reuseExistingServer` when `CI` is unset). We use the dev server instead of `vite preview` so the app keeps **relative** `/api/v1` requests (proxied to `:4000`). A production `npm run build` bakes `VITE_API_BASE_URL` from `.env.production` (e.g. Vercel) into the bundle, which would make preview hit the remote API and fail with CORS locally.

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
