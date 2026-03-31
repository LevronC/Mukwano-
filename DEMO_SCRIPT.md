# Mukwano — 5-minute demo script

## Audience and goal

- **Audience**: Professor, interview panel, or demo viewers who may not read your full design doc.
- **Goal in 5 minutes**: Show that **governance is enforced in the backend**, **money is simulated but accounting is real**, and **transparency is architectural** — not trust in one person.

## Time budget (300 seconds)

| Block                  | Time  | Purpose                                                         |
| ---------------------- | ----- | --------------------------------------------------------------- |
| Hook + problem         | ~0:45 | Why diaspora pooling needs rules, not vibes                     |
| Architecture one-liner | ~0:30 | Browser → API → Postgres; frontend never mutates balances       |
| Live walkthrough       | ~3:00 | Auth → circle → contribution → admin verify → vote → visibility |
| Close + upgrade path   | ~0:45 | Demo mode, ethical simulation, DAO as rail swap                 |

Adjust live walk if the build is partial: **skip tabs** you have not implemented; **never** improvise fake behavior on screen.

---

## Screen order (canonical path)

Use this order so each step **depends on the previous** and matches your doc.

1. **Sign in / sign up** — Establish identity; mention JWT session (one sentence).
2. **Onboarding (if present)** — Sector / country; “preferences drive discovery later.”
3. **Dashboard** — Treasury totals, active circles, voting alerts, activity feed — **narrate as system-of-record**, not decoration.
4. **Circle → Overview** — Rules, goal, governance model in plain language.
5. **Circle → Contributions** — Show **pending** vs **verified**; state clearly: “No balance change until verified.”
6. **Admin path (or explain if you demo from admin account)** — Approve contribution / proof; tie to **ledger-backed** behavior.
7. **Circle → Proposals & voting** — Open proposal; cast vote; show **one vote per user per proposal** if visible.
8. **Circle → Projects & progress** — Status / progress after “execution” (or explain lifecycle if UI is minimal).
9. **Portfolio** — Personal totals and allocation by circle; **impact-style**, not ROI hype.
10. **Admin panel (optional, 30s)** — Ledger read-only, moderation — reinforces “admin cannot change votes.”

If time is tight, **merge** 9–10 into one sentence each.

---

## Talk track (script you can read)

### 0:00–0:45 — Hook

> “Mukwano is a platform for diaspora communities to pool money toward projects back home. The hard part isn’t collecting intent — it’s **governance**: who decides, who can move value, and how we prove it. This MVP uses **simulated funds** but **real rules**: permissions, voting, and an append-only style ledger so nothing important happens only in the UI.”

### 0:45–1:15 — Architecture

> “The browser talks to a REST API; **all business logic lives on the server**. The frontend never updates balances or votes directly — that’s how we avoid hand-waving. Data lives in PostgreSQL; proofs can sit in file storage. We designed this so a future DAO is mostly **replacing rails**, not redesigning the product.”

### 1:15–4:15 — Live demo (narrate what you click)

- After login: “This dashboard aggregates **treasury-facing** signals — circles I’m in and things that need my attention.”
- Open a circle: “Every circle has **governance configuration** — who can propose, how voting works.”
- Contributions tab: “I submit a contribution; it lands as **pending**. Treasury does not treat it as real until it’s **verified** — that’s our demo-safe escrow model.”
- Switch to admin (or describe): “Verification is an **admin capability** — but admins **cannot change votes** or rewrite history; that’s a separate rule enforced in the API.”
- Back to circle — contributions now **verified**: “Balance and voting eligibility follow **server rules**, not the client.”
- Proposals: “Only contributors who meet the rules can vote. I’ll cast a vote — **one active vote per proposal per user**.”
- Projects: “When a proposal passes and is executed, project state updates — and the system records it in line with the ledger story.”
- Portfolio: “My portfolio is derived from **contributions and project status** — transparent, not speculative returns.”

### 4:15–5:00 — Close

> “`DEMO_MODE` means no real bank — labels say simulated escrow — but **governance and accounting behave as if production mattered**. That’s what we’d swap for wallets and contracts later without throwing away the product.”

---

## Phrases to use (aligned with your doc)

- “**Ledger-backed**” / “append-only record” when showing contributions or admin ledger.
- “**Permission-based**” for roles (member, creator, admin).
- “**Simulated escrow**” — controlled treasury ledger, not a bank.

## Phrases to avoid

- “Blockchain” unless you have 30 seconds for the upgrade table.
- “We encrypt everything” / vague security claims — stick to JWT + server enforcement if asked.

## If something breaks live

- **One fallback line**: “The API enforces this even if the UI is thin — I can show the same state via [admin ledger / contributions list].”
- **Never** fake a success on screen; say “this branch isn’t wired in the demo build” and move on.

---

## Optional one-page slide outline (titles only)

Use for Keynote or Google Slides; keep visuals minimal — you are the demo.

1. Mukwano — Governance-first diaspora pooling
2. The problem: intent vs. rules
3. Architecture — Browser → API → Postgres
4. Simulated funds, real accounting
5. Live demo — Auth & dashboard
6. Live demo — Circle & contributions (pending → verified)
7. Live demo — Admin verify & ledger story
8. Live demo — Proposals, voting, projects
9. Portfolio & transparency
10. DEMO_MODE today — DAO rails tomorrow
