# NEXORA Business Intelligence

**Turn Business Data Into Decisions.**

Enterprise Business Intelligence, predictive analytics, mathematical optimization and AI decision support — built on real business data, never on fake numbers.

![Stack](https://img.shields.io/badge/Next.js-15-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## What it is

A multi-tenant SaaS platform where each organization gets its own isolated workspace, users, dashboard, reports and integrations. Modules:

- **Executive Dashboard** — revenue, net profit, operating costs, growth, acquisition, conversion, retention and a Business Performance Score, all computed from database records.
- **Sales / Inventory / Customer / Marketing / Financial Intelligence** — product performance, low-stock & dead-stock alerts, CLV, churn-risk flags, ROAS / CAC / CPL, P&L and cash-flow views.
- **Optimization Center** — a real linear-programming budget allocator (primal simplex, Bland's rule) that proves optimality and reports OPTIMAL / FEASIBLE / INFEASIBLE.
- **AI Business Copilot** — server-side LLM (OpenAI) when `OPENAI_API_KEY` is set, otherwise a calculated summary from real aggregates, clearly labelled.
- **Decision Intelligence Center** — rule-based recommendations (problem, evidence, action, impact, risk, confidence) with approve / reject / assign, persisted and audit-logged.
- **Reports** — daily/weekly/monthly views with real CSV export and print.
- **Data import** — sales CSV with validation, duplicate detection, error report and import history.
- **Super Admin panel** — organizations, users, audit log.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL (PostgreSQL) and JWT_SECRET (long random string)

# 3. Create schema + seed the labelled demo dataset
npx prisma db push
npm run db:seed

# 4. Run
npm run dev        # http://localhost:3000
```

Demo login: **demo@nexora.app / demo1234** — the demo dataset is labelled "Demo data" everywhere until you import your own data or clear it (Settings → Data).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes (runtime) | PostgreSQL connection string. Not required for `npm run build`. |
| `JWT_SECRET` | Yes | Signs the httpOnly session cookie. |
| `OPENAI_API_KEY` | No | Enables AI-generated Copilot answers (server-side only). Without it the Copilot returns a calculated summary. |
| `ANALYTICS_SERVICE_URL` | No | Optional Python OR-Tools service in `analytics/`. |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (default `http://localhost:3000`). |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npx prisma validate` / `npx prisma generate` | Schema validation / client generation |
| `npm run db:push` | Push schema to the database |
| `npm run db:seed` | Seed the labelled demo dataset |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, multi-tenancy isolation, RBAC, data flow, and the Phase 1–8 roadmap (what is done vs remaining).

## Deploying to Vercel

1. Push this repo to GitHub (see below — **not done yet**).
2. In Vercel: Import Project → select the repo → framework preset **Next.js**.
3. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, optionally `OPENAI_API_KEY`.
4. Provision PostgreSQL (Vercel Postgres / Neon / Supabase), then run `npx prisma db push` and `npm run db:seed` against it (or seed via `npx prisma db seed` in a one-off run).
5. Deploy. Verify `/api/health` returns `{ "ok": true, "db": "connected" }`.

The Python service in `analytics/` is **optional** and is not part of the Vercel deploy — the TypeScript simplex engine is the default.

## Security notes

- Passwords are bcrypt-hashed (cost 12); sessions are JWTs in httpOnly, SameSite cookies.
- Every business row is scoped by `organizationId`; API routes and pages filter by the caller's org (see `docs/ARCHITECTURE.md`).
- Secrets live only in `.env` (gitignored). `.env.example` contains placeholders only.
- No fake payment confirmations: subscription plans exist in the data model; payment wiring is Phase 6.

## Honesty rules (enforced in code)

- Dashboard numbers are Prisma aggregates over real rows — no hardcoded constants.
- The optimizer reports OPTIMAL only when the simplex optimality condition holds.
- AI answers are labelled `ai-generated` or `calculated`; without an LLM key no output pretends to be from an LLM.
- Demo data is labelled "Demo data" in the UI and can be cleared; importing real data clears the flag.
