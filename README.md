# Mukwano

Mukwano ("friend" in Luganda) is a governance-first platform for diaspora communities to pool money collectively toward projects in their home countries.

Members form **Circles**, submit contributions, vote on proposals, and execute funded projects — all with server-enforced rules so no single person can override governance in the UI. The MVP uses simulated funds (`DEMO_MODE=true`) while keeping real accounting and governance logic.

**Core principle:** every balance mutation, vote count, and permission check happens in the API — never in the browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js 20 + Fastify + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Frontend | React 19 + Vite + TypeScript |
| Auth | JWT (HS256), 15-min access + 30-day refresh tokens |
| Monorepo | npm workspaces |

---

## Repository Structure

```
packages/
  api/    Fastify + Prisma backend  (port 4000)
  web/    React + Vite frontend     (port 5173)
  e2e/    Playwright end-to-end tests
scripts/  Dev helper scripts
prisma/   (schema lives in packages/api/prisma/)
```

---

## Prerequisites

Install these before anything else:

| Tool | Minimum version | Check |
|---|---|---|
| **Node.js** | 20.19.0 | `node --version` |
| **npm** | 9.x | `npm --version` |
| **Docker** (for PostgreSQL) | any recent | `docker --version` |

> If you prefer to run PostgreSQL without Docker, install PostgreSQL 16 locally and create a database named `mukwano` with user `mukwano` / password `mukwano`, then skip the Docker step below.

---

## Local Setup (step by step)

### 1. Clone and install dependencies

```bash
git clone https://github.com/LevronC/Mukwano-.git
cd Mukwano-
npm install
```

### 2. Create the API environment file

The repo ships a ready-to-use example. Copy it:

```bash
cp .env.example packages/api/.env
```

The default values in `.env.example` match the Docker Compose database below — you do **not** need to edit anything to run locally.

<details>
<summary>What each variable does</summary>

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs 15-minute access tokens (any string ≥ 32 chars) |
| `REFRESH_TOKEN_SECRET` | Signs 30-day refresh tokens (must differ from JWT_SECRET) |
| `DEMO_MODE` | `true` = simulated bank rails, real governance logic |
| `PORT` | API port (default 4000) |
| `CORS_ORIGIN` | Allowed browser origin (default http://localhost:5173) |
| `RESEND_API_KEY` | Optional — email delivery. Omit locally; verification links print to the API log instead |

</details>

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port 5432 with user `mukwano`, password `mukwano`, database `mukwano` — matching the `DATABASE_URL` in `.env.example`.

Verify it is healthy:

```bash
docker compose ps
```

### 4. Generate the Prisma client and run migrations

```bash
npm -w packages/api run prisma:generate
npm -w packages/api run prisma:migrate:deploy
```

`prisma:generate` builds the TypeScript client from the schema.  
`prisma:migrate:deploy` creates all database tables from the committed migration history (17 migrations).

> **Do not skip this step.** Without it the database has no tables and every API request returns a 500 error.

### 5. Start the development servers

From the repository root:

```bash
npm run dev
```

This starts both servers in one terminal:

| Server | URL |
|---|---|
| API (Fastify) | http://localhost:4000 |
| Web app (Vite) | http://localhost:5173 |

The web app proxies `/api` to the API, so you only need to open **http://localhost:5173** in your browser.

> **Port conflict?** Run `npm run dev:kill` then `npm run dev` again.

---

## Running individual servers

```bash
npm run dev:api   # API only
npm run dev:web   # Web only
```

---

## Running tests

### Unit tests

```bash
npm run test:unit
```

Runs Vitest unit tests for the API and frontend.

### End-to-end tests (Playwright)

The E2E suite spins up the built API + Vite dev server automatically. You need to build the API first:

```bash
npm run build:api
npm run test:e2e
```

First run: install the Chromium browser for Playwright:

```bash
npm -w @mukwano/e2e exec playwright install chromium
```

> E2E tests create a throwaway user via the API — no manual DB seeding required.

### Type checking

```bash
npm run typecheck
```

---

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start API + web together |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run dev:kill` | Free ports 4000 and 5173 |
| `npm run build:api` | Compile API to `packages/api/dist/` |
| `npm run build:web` | Bundle frontend |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run typecheck` | TypeScript type check (no emit) |

---

## Architecture overview

```
Browser (React, port 5173)
  │  /api/*  →  Vite proxy
  ▼
Fastify API (port 4000)
  │
  ├── JWT auth (access + refresh token rotation)
  ├── Business logic (circles, proposals, contributions, projects)
  ├── Append-only ledger (INSERT-only, DB trigger blocks UPDATE/DELETE)
  └── Prisma ORM
        └── PostgreSQL 16
```

Key security properties enforced at the server layer:
- No client can mutate balances — all accounting is API-side
- One vote per user enforced in SQL before commit
- Role checks (admin / treasurer / member) on every protected route
- Refresh token family rotation — compromised tokens invalidated on reuse

---

## Product scope (MVP)

- Email-verified account signup with JWT auth
- Circle creation, membership, and role-based governance
- Contribution submission with pending → verified lifecycle
- Append-only treasury ledger
- Proposal creation with one-vote-per-user enforcement
- Project lifecycle tracking (funded → in-progress → completed)
- Portfolio and dashboard views
- Admin controls for moderation and platform oversight
- Public explore page (no login required)

---

## DEMO_MODE

When `DEMO_MODE=true` (the default for local dev), real bank transfer rails are replaced with simulated ones. All governance logic — vote counting, balance checks, ledger entries, permissions — runs identically to production. This lets you test the full flow without connecting real payment infrastructure.

---

## Docs

| File | Contents |
|---|---|
| `SYSTEM_DESIGN.md` | System architecture and domain design |
| `PLAN.md` | Phase-based implementation plan |
| `packages/e2e/README.md` | E2E test guide (local + CI) |
