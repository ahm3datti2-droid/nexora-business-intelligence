# NEXORA Business Intelligence — Architecture

## 1. Overview

NEXORA BI is a multi-tenant SaaS platform (Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, Prisma 6 + PostgreSQL). The frontend, API routes and analytics run in one Next.js app; the Python FastAPI + OR-Tools service in `analytics/` is optional.

```
┌────────────────────────────────────────────────────────────┐
│  Next.js App (Vercel)                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Pages /  │  │ API routes   │  │ lib/                  │ │
│  │ AppShell │  │ /api/*       │  │ prisma (lazy)         │ │
│  │ (RSC)    │  │ auth, import │  │ auth (JWT/bcrypt)     │ │
│  └──────────┘  │ copilot, opt │  │ optimizer (simplex)   │ │
│                └──────────────┘  │ recommendations (rules)│ │
│                                  └───────────────────────┘ │
└──────────────┬───────────────────────────────┬─────────────┘
               │ Prisma                        │ HTTP (optional)
        ┌──────▼──────┐              ┌─────────▼──────────┐
        │ PostgreSQL  │              │ analytics/ FastAPI │
        │ (Vercel/    │              │ + OR-Tools SCIP    │
        │  Neon/      │              │ POST /optimize     │
        │  Supabase)  │              └────────────────────┘
        └─────────────┘
```

## 2. Modules (Phase 1 — done)

| Module | Route | Data source |
|---|---|---|
| Landing | `/` | Static brand/pricing |
| Auth | `/login`, `/register` | `User` + `Organization` |
| Executive Dashboard | `/dashboard` | Prisma aggregates (sales, expenses, customers, campaigns) |
| Sales Intelligence | `/sales` | `Sale`/`SaleItem` group-by product |
| Inventory Intelligence | `/inventory` | `InventoryItem` + reorder/dead-stock rules |
| Customer Intelligence | `/customers` | CLV, repeat share, 90-day churn flag |
| Marketing Intelligence | `/marketing` | `Campaign` → ROAS, CAC, CPL |
| Financial Intelligence | `/finance` | P&L by month, budget-vs-actual |
| Optimization Center | `/optimization` + `/api/optimize` | `lib/optimizer.ts` (simplex) |
| AI Copilot | `/copilot` + `/api/copilot` | OpenAI server-side, else calculated summary |
| Decision Center | `/decisions` + `/api/decisions/[id]` | `lib/recommendations.ts` rules → `Recommendation` |
| Reports | `/reports` + `/api/reports/export` | Real CSV export from DB |
| Settings / Data import | `/settings`, `/settings/data` + `/api/import` | CSV validation, dedupe, `ImportLog` |
| Super Admin | `/admin` | Orgs, users, `AuditLog` |

## 3. Multi-tenancy isolation

- Every business table carries `organizationId` (foreign key, indexed).
- Pages call `requireOrg()` (`lib/server.ts`) which resolves the session user and their org; all queries filter `where: { organizationId: org.id }`.
- API routes call `getSessionUser()` and scope writes/reads to that org.
- Only `SUPER_ADMIN` (role-gated on `/admin`) reads across organizations.
- No cross-tenant query path exists in the app layer; row-level isolation is by `organizationId` on every query. (Future hardening: Postgres RLS — Phase 7.)

## 4. RBAC

Roles: `SUPER_ADMIN` > `ORG_OWNER` > `ADMIN` > `MANAGER` > `ANALYST` > `VIEWER`.

- `register` creates an org + `ORG_OWNER`.
- CSV import requires `MANAGER` or above; clearing demo data requires `ORG_OWNER`/`ADMIN`.
- `/admin` requires `SUPER_ADMIN`, otherwise redirects to `/dashboard`.
- Decision approve/reject/assign is available to any signed-in org member (Phase 5 refinement: restrict by role).

## 5. Auth & security

- Email + password; bcrypt cost 12; JWT (HS256, `jose`) in an httpOnly, SameSite=lax cookie, 7-day expiry.
- Secrets only in `.env` (gitignored); `.env.example` has placeholders.
- Input validation with zod on all API routes; Prisma parameterized queries (no raw SQL with user input).
- Audit log written for org creation and recommendation status changes.

## 6. Data flow

1. User signs in → JWT cookie → `getSessionUser()` on every server page/API.
2. Pages are server components (`force-dynamic`) that aggregate with Prisma and render; charts are client components (recharts).
3. Mutations go through API routes (zod-validated), never direct DB access from the browser.
4. CSV import: parse → validate row-by-row → dedupe on `external_ref` → upsert product/customer → create sale → write `ImportLog` → clear `demoData` flag on first real import.

## 7. Optimization engine

- Problem: maximise Σ roiᵢ·xᵢ s.t. Σxᵢ ≤ budget, minᵢ ≤ xᵢ ≤ maxᵢ.
- Substitution yᵢ = xᵢ − minᵢ gives standard form max cᵀy, Ay ≤ b, y ≥ 0, b ≥ 0.
- Solver: primal simplex with Bland's rule (`lib/optimizer.ts`). OPTIMAL is reported only when all reduced costs ≤ 0 at the final tableau. INFEASIBLE when Σmin > budget or max < min. UNBOUNDED is detected (cannot occur here due to upper bounds).
- The Python service (`analytics/main.py`) solves the same problem with OR-Tools SCIP; it is optional and not required for the Vercel deploy.

## 8. AI Copilot honesty

- With `OPENAI_API_KEY`: server-side call to OpenAI, answer labelled `ai-generated`, grounded only in the org's aggregates.
- Without a key: a calculated summary from real DB aggregates, labelled `calculated` / "no LLM key configured". No output ever pretends to be from an LLM.

## 9. Demo-data honesty

- `prisma/seed.ts` creates one org ("Nexora Demo Company", slug `nexora-demo`) with deterministic demo transactions and prints that it is DEMO data.
- `Organization.demoData` drives a visible "Demo data" badge on dashboard/module pages.
- "Clear demo data" (`/api/demo/clear`) deletes the org's demo rows; the first real CSV import also clears the flag.

## 10. Roadmap — Phases 1–8

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture, repo, schema, foundation | **Done (this build)** |
| 2 | Auth, orgs, permissions, multi-tenancy | Done (core); fine-grained per-resource policies remain |
| 3 | Core dashboards & analytics modules | Done (6 modules, real aggregates) |
| 4 | OR engine | Done (TS simplex + optional Python OR-Tools); more problem types (scheduling, workforce) remain |
| 5 | AI Copilot & Decision Intelligence | Done (core); LLM key + richer prompts remain |
| 6 | Reports, integrations, subscriptions | Partial: reports + CSV done; integrations & payment wiring remain |
| 7 | Super Admin, security, testing, performance | Partial: admin panel + audit log done; automated test suite, rate limiting, RLS remain |
| 8 | GitHub sync + Vercel production deploy | **Not done** — repo not pushed, no Vercel project yet, no Postgres provisioned |

## 11. Known limitations (Phase 1)

- No automated test suite yet (manual verification only).
- No rate limiting / CSRF middleware yet.
- No Postgres RLS (isolation is app-layer only).
- No email verification / password reset.
- Forecasting is descriptive (trend tables), not a statistical forecaster yet.
- Subscriptions: plan enum + display only; no payment provider.
- Integrations layer is designed, not built.
