# CivicResolve — AI Observation Engine

Everything added in this branch: the full file inventory, every environment
variable, all street-imagery provider setups, and the background worker.
Written so the main developer can read it end-to-end and decide what to
enable, what to register for, and what to trust.

> The locally-trained YOLO/detector pipeline (datasets, training, ONNX, and
> the street-imagery "discovery" pass) was tried, measured, and **scrapped** —
> see `docs/observation-engine-decisions.md` §9 for the evidence. This
> engine runs entirely on the cloud vision model (opencode gateway, local
> Ollama fallback).

## 0. Removed features (history, so nobody re-builds them blind)

| Feature | What it was | Why removed |
|---|---|---|
| Auto-discovery (pass 4) | Background scan of street imagery near active areas → CANDIDATE issues (hidden status, admin review queue) | Depended on the trained YOLO detector; real-world eval showed the model misses wide-scene defects and false-positives on scene classes → the feature's core assumption (trustworthy cheap detection) failed. |
| Trained YOLO detector | YOLO11n on RDD2020-India + streetlight + manhole sets (mAP50 0.69 test split) | Unseen real-world photos: 0/4 potholes detected even at 0.05 conf; scene classes fired on generic streets. Replaced by the cloud vision model for all judgment. |
| ML datasets + converters | ~10 GB of RDD2020/streetlight/manhole/TACO data, VOC/classification→YOLO converters | Part of the scrapped pipeline (see `docs/observation-engine-decisions.md` §9). |
| Ola street-view as primary provider | Implemented per Ola OAS spec (`/sli/v1/streetview/{imageId,coverage,metadata}`) | Still present in `lib/imagery.ts` — just needs `OLA_MAPS_API_KEY` (see §4). |

The git history preserves all of it (`git log --all`); the decisions doc has
the measurements.

---

## 1. What this is

An AI layer that verifies civic reports against real street imagery. Design
rule: **AI suggests, humans decide** — the engine flags, compares, and
evidences; it never auto-rejects, auto-resolves, or auto-publishes.

Pipeline per report:
```
citizen photo
   │
   ├─ [report time] fake-photo guard (screenshot / reused photo)      → warn/reject
   ├─ [<10 min]     auto-verify  (street imagery vs citizen photo)    → verdict + confidence
   │                  └ freshness decay (old imagery = lower confidence)
   ├─ [<10 min]     duplicate sweep (nearby issues, vision "same?")   → admin queue
   └─ [on RESOLVED] resolution check (proof photo vs original)        → "actually fixed?"
```

---

## 2. Files — complete inventory

### New files

| File | What it does |
|---|---|
| `lib/imagery.ts` | Street-imagery chain: Ola Street View → Mapillary → Kartaview. Newest-photo preference, size probing, timeouts, graceful "no coverage". |
| `lib/verify-core.ts` | Shared verification core (used by BOTH the API route and the background worker so logic never drifts). `runVerification()` + `verifyResolution()` + `computeFreshnessFactor()`. |
| `lib/duplicate-vision.ts` | Vision duplicate check: "do these two photos show the SAME problem?" (multi-image VLM). |
| `lib/fake-detect.ts` | Fake-photo guards: VLM screenshot detection + sharp average-hash for reused-photo detection. |
| `app/api/ai/verify-issue/route.ts` | POST — verify an issue against street imagery. Auth, feature-flag, rate-limited. |
| `app/api/ai/check-photo/route.ts` | POST — screenshot + reuse check for the report flow. Auth, rate-limited. |
| `app/api/admin/verification-stats/route.ts` | GET — engine stats + recent evidence (admin only). |
| `components/ai/verification-card.tsx` | Evidence card on the issue page (photos side by side, verdict, confidence, stale badge, Re-verify button). |
| `components/ui/verification-badge.tsx` | Compact chip for issue cards/lists (AI VERIFIED / CONFLICTED / SUSPECTED FAKE). |
| `app/admin/verification/page.tsx` | Admin overview: stat cards + recent-evidence table. |
| `scripts/verify-worker.mjs` | Background worker, 3 passes (see §5). |
| `tests/fake-detect.test.ts` | Hash determinism + Hamming-distance tests. |
| `tests/freshness.test.ts` | Freshness-decay math tests (caught a real bug during development). |
| `vitest.config.ts` | Vitest config (node env, `tests/**`). |
| `pnpm-workspace.yaml` | pnpm 11 `allowBuilds` map (sharp, oxide, prisma). |

### Modified files

| File | Change |
|---|---|
| `lib/ollama.ts` | Multi-image support; gateway model names now come from `OPENCODE_*`; `reasoning_effort` only on text calls (vision models reject it); gateway-first with local-Ollama fallback; `VISION_PROVIDER` override. |
| `lib/email-service.ts` | `SKIP_EMAIL_SENDING=true` no longer requires SMTP creds (inert jsonTransport) — registration works without a mail server. |
| `lib/models.ts` | Issue interface + verification/resolution fields. |
| `lib/types.ts` | Frontend Issue type + the same fields (camelCase). |
| `prisma/schema.prisma` | Issue: `verification_*` (8 cols), `resolution_verdict/confidence/checked_at`, `duplicate_vision_checked`. |
| `app/api/issues/route.ts` | List response now carries verification fields (powers the badges). |
| `app/api/issues/[id]/route.ts` | Detail response carries the full evidence trail. |
| `app/issues/[id]/page.tsx` | Renders the VerificationCard. |
| `app/report/page.tsx` | Calls `check-photo` before auto-fill (fake-photo guard). |
| `components/ui/issue-card.tsx` | VerificationBadge next to status. |
| `components/navigation/navbar.tsx` | Admin nav: "AI Verification". |
| `package.json` | devDeps: `prisma@^6`, `@prisma/client@^6`, `vitest`, `sharp`; `"test": "vitest run"`. |
| `tsconfig.json` | `allowImportingTsExtensions` (Node type-stripping for the worker). |
| `.gitignore` | No longer ignores `*.test.*` (the test suite is part of the repo). |

---

## 3. Environment variables — the complete reference

### Feature flags (default in `.env.example`)

| Variable | Default | Effect |
|---|---|---|
| `ENABLE_AI_VERIFICATION` | `true` | On/off for `/api/ai/verify-issue`. |
| `ENABLE_AI_DUPLICATE_VISION` | `true` | Worker pass 2 (vision duplicate sweep). |
| `ENABLE_AI_RESOLUTION_CHECK` | `true` | Worker pass 3 (proof vs original). |

### AI providers

| Variable | Purpose |
|---|---|
| `OPENCODE_URL` | OpenAI-compatible gateway base URL (default `https://opencode.ai/zen/go/v1`). |
| `OPENCODE_API_KEY` | Gateway key — primary AI backend. When unset, everything falls back to local Ollama. |
| `OPENCODE_CHAT_MODEL` | Gateway chat model (default `deepseek-v4-flash`). |
| `OPENCODE_VISION_MODEL` | Gateway vision model (default `mimo-v2.5`). |
| `OLLAMA_URL` | Local Ollama base (default `http://localhost:11434`). |
| `OLLAMA_CHAT_MODEL` | Local chat model (default `qwen2.5:7b`). |
| `OLLAMA_VISION_MODEL` | Local vision model (default `qwen3-vl:8b-thinking`). |
| `VISION_PROVIDER` | `gateway` (default) = opencode first, Ollama fallback. `local` = force all image calls to Ollama (dev convenience). |

### Street imagery (see §4 for setup walkthroughs)

| Variable | Purpose |
|---|---|
| `OLA_MAPS_API_KEY` | Ola Street View (primary when set). |
| `MAPILLARY_CLIENT_TOKEN` | Mapillary v4 client token (second provider). |
| *(none)* | Kartaview — no auth, always available as the fallback. |

### Worker tuning

| Variable | Default | Effect |
|---|---|---|
| `VERIFY_WORKER_MAX` | `3` | Max issues auto-verified per run. |
| `VERIFY_WORKER_DUP_MAX` | `2` | Max duplicate-vision checks per run. |

### Database

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:port/db` — used by `prisma db push` (the app itself uses `DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME` via mysql2). |

---

## 4. Street-imagery providers — set up what you decide to

The chain tries **Ola → Mapillary → Kartaview** in order. Missing keys are
skipped silently. The system works with Kartaview alone; every key you add
upgrades coverage. All three can coexist.

### Kartaview — no setup (always on)
Public API, no auth. Coverage is patchy (city-centers mainly). Used as the
automatic fallback. Nothing to configure.

### Mapillary — free, email only, no card (recommended upgrade)
1. Sign up at https://www.mapillary.com (email).
2. Developer dashboard: https://www.mapillary.com/dashboard/developers → create an application → Client ID + Client Secret.
3. Exchange for a client token:
   `POST https://graph.mapillary.com/token` with `client_id`, `client_secret`, `grant_type=client_credentials` → `access_token`.
4. Set `MAPILLARY_CLIENT_TOKEN` in `.env`.
No billing. The v4 API (graph.mapillary.com) Image Radius Search is what the code uses.

### Ola Maps — India-native, best coverage, but REQUIRES a card (your call)
Ola Maps APIs are free for the first year (500K req/month), but Krutrim Cloud
now requires a Razorpay autopay mandate (card on file) before creating ANY
credentials. Decide for yourself — here is the full path if you want it:

1. Register/sign in at https://cloud.olakrutrim.com (email + phone OTP).
2. Left sidebar → **Ola Maps** → **Credentials** → **+ New Credentials**.
3. The "Setup Autopay" modal appears (required): cardholder name, mobile, card
   via Razorpay. ₹1 authorization charge (usually never settles). The modal
   states you can cancel autopay later from the same page.
4. Create the credential (type: API Key) → copy the key.
5. Set `OLA_MAPS_API_KEY` in `.env` → street view becomes the primary provider
   (endpoint: `api.olamaps.io/sli/v1/streetview/...`).

The street-view flow the code implements (from the OpenAPI spec):
`imageId` (nearest) → `metadata` (image URL, snapped coords) → image.

---

## 5. Background worker (`scripts/verify-worker.mjs`)

Three passes per run, sequential, idempotent:

| Pass | Job | Guard |
|---|---|---|
| 1 | Auto-verify unverified PENDING issues | `ENABLE_AI_VERIFICATION` |
| 2 | Vision duplicate sweep (nearby same-category pairs) | `ENABLE_AI_DUPLICATE_VISION` |
| 3 | Resolution check on RESOLVED issues with proof photos | `ENABLE_AI_RESOLUTION_CHECK` |

Run manually:
```bash
node --env-file=.env scripts/verify-worker.mjs
```

Installed scheduler (systemd user timer, runs every 10 minutes):
```
systemctl --user list-timers civicresolve-verify
# unit files: ~/.config/systemd/user/civicresolve-verify.{service,timer}
# log: /tmp/verify-worker.log
```
Without systemd (e.g. a server with cron):
```cron
*/10 * * * * cd /path/to/CivicResolve && node --env-file=.env scripts/verify-worker.mjs >> /tmp/verify-worker.log 2>&1
```

---

## 6. Verification — how to prove it works

```bash
pnpm install            # first time
pnpm run type-check     # must be clean
pnpm test               # vitest suite
node --env-file=.env scripts/verify-worker.mjs   # manual worker run
```
Then in the browser: `/issues/<id>` shows the evidence card (photos, verdict,
confidence, stale warning). Admin: `/admin/verification` (stats + evidence).
Report flow: upload a screenshot → warning; re-upload an existing issue's
photo → reused warning.

---

## 7. Known gotchas (read before changing things)

- `prisma db push` needs `prisma@6` — Prisma 7 removes the `url` in the
  datasource block and rejects this schema. The pin is in `package.json`.
- pnpm 11: native build permissions live in `pnpm-workspace.yaml`
  (`allowBuilds`), not `package.json`'s `pnpm` field.
- Node runs the worker via type-stripping: relative TS imports inside
  `lib/*.ts` MUST keep the `.ts` extension (e.g. `lib/verify-core.ts`).
- `db.query()` (the wrapper) uses prepared statements — bind params don't work
  in `LIMIT ?` / `INTERVAL ? DAY`; interpolate constants instead.
- The `users` table column is `password` (not `password_hash`).
