# CivicResolve

Civic issue reporting and management platform: citizens report municipal problems (potholes, streetlights, garbage, utilities, safety), vote and comment on them, and track resolution — while municipal organizations and administrators manage assignments, duplicates, appeals, and analytics.

Built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + MySQL + Redis**, with an AI layer (opencode gateway) and a **WhatsApp channel** (n8n + a Prisma/Express bridge) sharing one database.

## Architecture

```
Citizens (web app, port 3111) ─┐
                              ├── MySQL 8 (civicresolve_dev :3307)  ← single source of truth
Citizens (WhatsApp) ── n8n ──┘        (Prisma schema: prisma/schema.prisma, 20 models)
        workflow "CivicResolve WhatsApp"
            └── CivicResolve Bridge (Express + Prisma, :3320, x-api-key auth)
                    /api/issue · /api/issue/:id · /api/health
                    /api/ai-reports (submit|status|location|rewrite|confirm|cancel)
                    /api/account-link (OTP web ↔ WhatsApp linking)
Redis (:6379) — response caching (issues, AI chat, dashboard stats)
```

- **Web app** — this repo (`Newer1107/CivicResolve`).
- **WhatsApp bridge** — separate repo `Newer1107/civicresolve-whatsapp` (private): Express + Prisma service; media download via Meta Graph API, vision analysis via the opencode gateway, atomic issue creation on confirm, account linking.
- **n8n** — hosts the WhatsApp workflow (trigger, structural photo/location routing, DeepSeek agent, send nodes).

## Roles

| Role | Capabilities |
|---|---|
| **CITIZEN** | Report issues (photo-first AI auto-fill or manual), vote, comment, appeal rejections, track own reports, points/badges |
| **ORGANIZATION_ADMIN** | Organization dashboard, assign issues to members, manage team, resolve with photo proof, AI image analysis |
| **ORGANIZATION_MEMBER** | My Issues (assigned), Start Working / Mark Resolved with photo |
| **NGO_ADMIN** | NGO organization reporting civic issues |
| **ADMIN** | Global dashboard + analytics, user management, organizations, NGOs, duplicate management, appeals review, performance monitoring |

## Features

### Issue lifecycle
- Report with photo + location pin (Leaflet picker, address autocomplete), anonymous option
- Status flow: `PENDING → IN_PROGRESS → RESOLVED` (or `REJECTED`); resolution requires photo proof; status updates + assignments trigger email notifications
- Automatic routing to the responsible organization by category (ROADS, LIGHTING, SANITATION, PARKS, UTILITIES, SAFETY, OTHER)
- Engagement-based priority visualization: score = votes×1 + comments×2, colored markers/cards (white → yellow → orange → red, resolved always green), map fit-bounds to pinned issues
- Voting (up/down) and threaded comments

### AI (opencode gateway)
- `lib/ollama.ts` is the shared AI client: **opencode gateway first** (`OPENCODE_URL`, default `https://opencode.ai/zen/go/v1`), **Ollama fallback** when no key is set. Chat model `deepseek-v4-flash` (label shown as `${OLLAMA_CHAT_MODEL} (AI)`), vision model `mimo-v2.5`; `reasoning_effort: none` for fast responses; Redis-cached chat replies.
- **Chat assistant** (`/api/chat`, floating widget): role-aware civic assistant with live platform statistics.
- **Photo auto-fill** (`/api/ai/auto-fill-issue`): citizen uploads a photo → AI generates title + description for review before submit.
- **Admin image analysis** (`/api/ai/analyze-image`): infrastructure assessment for organization admins (severity, safety, resources).
- Feature flags: `ENABLE_AI_AUTO_FILL`, `ENABLE_AI_CHAT_ASSISTANT`, `ENABLE_AI_IMAGE_ANALYSIS`.

### WhatsApp channel
Full photo-report flow: citizen sends a photo → bridge downloads + sniffs the media (non-photos rejected) → vision model classifies (`is_issue` gate; non-issue photos REJECTED) → summary pushed to the citizen (analysis-done webhook) → location pin attached structurally → citizen confirms/rewrites → **confirm creates the real platform issue atomically** and returns the tracking ID → completion email.
- Stale-state guards: PROCESSING > 2 min and SUMMARY_READY > 24 h auto-rejected; one-in-flight per citizen; REJECTED reports can never be rewritten/pinned/confirmed.
- Text reports: agent extracts category/title/description/address → `/api/issue` → tracking ID. Status queries: `status <id>`.
- **Account linking**: OTP flow (`/api/account-link`) binds a WhatsApp number to an existing web account, so WhatsApp reports appear on the citizen's real profile instead of the `wa_<number>@civicresolve.com` auto-account.

### Duplicate detection & management (admin)
- Advisory algorithm: geolocation proximity (Haversine) + category + text similarity flags possible duplicates for review
- `/admin/duplicates`: pending review queue, link/merge/separate/ignore actions, linked-groups audit, stats (linked, confirmed, pending, ignored)

### Appeals (admin)
- Citizens appeal rejected issues (`/api/issues/[id]/appeal`); admin reviews at `/admin/appeals` (approve → reopen, or deny)

### Organizations & NGOs
- `/organization`: org dashboard (stats, recent issues, team, quick actions), `/organization/issues` (assign, resolve with photo), `/organization/members` (add/remove members, role changes)
- `/admin/organizations`: create orgs, map categories, assign users
- `/admin/ngos`: NGO registry (create/edit/activate) — NGOs report issues with their own admin role

### Citizen profile & gamification
- `/profile`: identity card, points, achievements/badges, submitted-issues table (category/status/priority/engagement), edit profile
- `/my-issues`: issues reported or assigned to the citizen, with filters, stats cards, and Start Working / Resolve with Photo actions

### Admin dashboard
- `/admin`: 8 stat cards (issues, users, votes, comments, resolution time), management tools grid, charts (issues by category pie, issues trend line), top contributors, recent activity, date-range filter, CSV/JSON export
- `/admin/monitoring/performance`: performance metrics dashboard
- `/admin/users`, `/admin/issues`: management tables with filters

### Platform
- JWT auth (httpOnly cookie, edge-verified middleware + security headers + CORS), bcrypt password hashing, rate limiting, input sanitization, structured logging
- Email notifications (nodemailer) — assignment, status updates, welcome, report confirmation; `SKIP_EMAIL_SENDING` for dev
- Redis caching (ioredis) with pattern-based invalidation; performance monitoring; error boundaries
- PWA (manifest, icons, offline page, install prompt), notification bell with read/unread, theme toggle

## Tech stack

- **Framework**: Next.js 15.2.4 (App Router), React 19, TypeScript strict
- **UI**: Tailwind CSS v4, Radix UI primitives, shadcn-style components, Framer Motion, Lucide icons, Recharts, sonner toasts
- **Data**: MySQL 2 (mysql2), Prisma schema (SSOT), Redis caching
- **Maps**: React Leaflet + OpenStreetMap
- **AI**: opencode gateway (OpenAI-compatible) → deepseek-v4-flash / mimo-v2.5; Ollama fallback
- **Auth/security**: jsonwebtoken, bcryptjs, zod env validation, rate limiter, security headers middleware

## Getting started

### Prerequisites
- Node.js 18+, MySQL 8, Redis 5+ (docker recommended)
- `OPENCODE_API_KEY` for AI features (optional: falls back to Ollama at `OLLAMA_URL`)

### Setup

```bash
git clone https://github.com/Newer1107/CivicResolve.git
cd CivicResolve
npm install        # or pnpm install
cp .env.example .env   # fill in DB/Redis/JWT/OPENCODE values
npx prisma db push     # sync schema (canonical schema lives in prisma/schema.prisma)
npm run dev            # http://localhost:3000 (dev) / npm run build && npm start
```

### Environment

Key variables (see `.env.example` for the full list):

| Group | Variables |
|---|---|
| Database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Redis | `REDIS_URL` (+ retry tuning) |
| Auth | `JWT_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` |
| AI | `OPENCODE_URL`, `OPENCODE_API_KEY`, `OPENCODE_CHAT_MODEL`, `OPENCODE_VISION_MODEL`, `OLLAMA_URL` (fallback) |
| Email | `EMAIL_HOST/PORT/USER/PASS/FROM`, `SKIP_EMAIL_SENDING` |
| Feature flags | `ENABLE_AI_*`, `ENABLE_ISSUE_*`, `ENABLE_EMAIL_*`, `ENABLE_PERFORMANCE_MONITORING`, etc. |

## Development notes

- **Routes**: pages in `app/`, API routes in `app/api/**/route.ts`, shared UI in `components/ui/`, domain logic in `lib/` (database, auth-utils, cache, email-service, duplicate-detection, ollama, redis, rate-limiter).
- **Schema**: `prisma/schema.prisma` is the canonical SSOT (20 models); the WhatsApp bridge symlinks to it.
- **API conventions**: JSON responses via `lib/api-response.ts`, auth via `lib/auth-utils.ts` (JWT cookie), env validation via `lib/env-validation.ts`.
- **Tests**: `npm run type-check` (tsc), `npm run lint`. No test suite yet.

## Related repositories

- `Newer1107/civicresolve-whatsapp` — WhatsApp bridge (Express + Prisma, vision analysis, account linking)
- n8n workflow `wdtMRQL9U193Z6pE` — WhatsApp automation (webhook trigger, structural routing, DeepSeek agent)
