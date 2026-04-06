# Mukwano

Mukwano ("friend" in Luganda) is a governance-first platform for diaspora communities to pool money collectively toward projects in their home countries.

Members form circles, submit contributions, vote on proposals, and execute funded projects with server-enforced rules. The MVP uses simulated funds in `DEMO_MODE` while keeping real governance and accounting logic.

## Core Value

Governance is enforced in the server layer, not the UI:

- all balance mutations happen in the API
- vote counting is validated server-side
- permissions are checked before every protected action

## Tech Stack

- `Node.js` + `TypeScript`
- `Fastify` API
- `PostgreSQL 16`
- `Prisma ORM`
- `React` + `TypeScript` frontend (`Vite`)
- npm workspaces monorepo

## Repository Structure

```text
packages/
  api/   # Fastify + Prisma backend
  web/   # React + Vite frontend
  e2e/   # end-to-end tests
```

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Start PostgreSQL

If your project includes Docker Compose:

```bash
docker compose up -d
```

### 3) Configure API environment

Create or update:

- `packages/api/.env`

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`

### 4) Run the app

From repo root:

```bash
npm run dev
```

This starts:

- API on `http://localhost:4000`
- Web app on `http://localhost:5173`

The web app proxies `/api` to the backend.

If ports are busy:

```bash
npm run dev:kill
npm run dev
```

## Useful Scripts

- `npm run dev` - run API + web
- `npm run dev:api` - run API only
- `npm run dev:web` - run web only
- `npm run dev:kill` - free dev ports (`4000`, `5173`)

## Product Scope (MVP)

- authentication with access + refresh tokens
- circle creation and role-based governance
- contributions with pending -> verified lifecycle
- append-only ledger for treasury events
- proposal creation and one-vote-per-user enforcement
- project lifecycle tracking
- portfolio and dashboard views
- admin controls for moderation and oversight

## DEMO_MODE

`DEMO_MODE` keeps governance and accounting behavior identical to production while using simulated fund rails.

## Architecture and Planning Docs

- `SYSTEM_DESIGN.md` - system architecture and domain design
- `.planning/PROJECT.md` - product definition and requirements
- `.planning/ROADMAP.md` - phase-based delivery roadmap

## Current Status

Mukwano is under active development with a phase-based implementation plan for backend, frontend, and production-readiness workstreams.
