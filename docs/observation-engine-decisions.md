# CivicResolve — AI Observation Engine: What Was Added and Why

A companion to `docs/ai-observation-engine.md` (the reference: files, env vars,
provider setups). This doc explains **why** each piece exists, what problem it
solves, and the evidence behind the decisions — so the next developer can
understand the reasoning and override it deliberately, not by accident.

---

## 1. Why verify reports against street imagery at all?

**Problem:** Anyone can report anything. A civic platform that auto-publishes
unchecked reports gets polluted with fake, mistaken, and out-of-scope issues —
and then nobody trusts the platform.

**Solution:** Every report's location is cross-checked against external
street-level imagery (Ola Street View → Mapillary → Kartaview). The vision
model compares the citizen's photo with a real street photo of that exact
location. This catches the two dominant abuse classes:
- **Photo from elsewhere** — a similar-looking pothole photo reported at a
  different location. The street photo doesn't match → CONFLICTED. (Validated
  end-to-end: a real rural pothole photo reported at MG Road returned
  "different_issue" with explicit location-mismatch reasoning.)
- **Clean road reported as damaged** — the street photo shows a fine road →
  SUSPECTED FAKE.

**Why street-level, not satellite:** satellite imagery cannot show potholes,
cracks, or garbage piles (verified during research — Bhuvan offers WMS/WMTS
tiles only, no usable download API; Planetary Computer is context-only). Only
street-level imagery works for this problem.

## 2. Why freshness decay?

**Problem:** Street imagery is historical. A street photo from 2020 saying
"road looks fine" must NOT be treated as evidence that a 2026 pothole report
is fake. Old imagery masquerading as current would be the system's worst
failure mode.

**Solution:** every verdict's confidence is multiplied by a freshness factor:
`1.0` for imagery under a year old, linearly decaying to a `0.4` floor at
5 years (the test suite pins this exact curve — it caught a real bug where the
implementation hit its floor at 3.4 years instead of 5). The UI shows the
capture date and a "may not reflect current condition" warning. The engine
also prefers the NEWEST available photo, not just the closest.

## 3. Why opencode gateway primary + local Ollama fallback?

**Problem:** AI calls must work everywhere, with and without cloud access, and
not silently fail when one provider hiccups.

**Solution:** `lib/ollama.ts` tries the opencode gateway first (deepseek-v4-flash
chat, mimo-v2.5 vision); on any failure it falls back to the local Ollama
(qwen3-vl:8b-thinking vision). `VISION_PROVIDER=local` forces local-only vision
for development. This was also the fix for two latent upstream bugs: the
gateway model names were being read from the `OLLAMA_*` vars (so the gateway
was being asked for Ollama model names), and `reasoning_effort: none` was being
sent to the vision model, which rejects it with HTTP 400 — meaning the original
analyze-image endpoint was silently broken against the gateway.

## 4. Why a background worker instead of verifying inline?

**Problem:** Verification (imagery fetch + vision call) takes 10–20 seconds.
Running it inside the report request would make reporting feel broken, and
would only cover the web path — WhatsApp reports (the highest-volume channel)
go through a separate bridge we don't control.

**Solution:** a standalone worker (`scripts/verify-worker.mjs`) that sweeps the
database every 10 minutes, covering **all** report paths. Three idempotent
passes: auto-verify, vision duplicates, resolution check. Each pass has its own
feature flag so the next developer can disable any piece without touching code.
The worker is installed as a systemd user timer (cron line documented for
servers).

## 5. Why vision-based duplicate detection?

**Problem:** the existing duplicate detector (geo distance + category + text)
misses the most common duplicate: the same pothole photographed by two people
from slightly different angles. Text never matches; distance does.

**Solution:** for nearby same-category pairs, the multi-image vision model
answers "is this the SAME problem?" and the pair is auto-flagged into the
admin duplicates queue with vision confidence. Validated: an identical-photo
pair 8m apart was flagged at 1.00; different-photo pairs were correctly
rejected at 0.90–0.95. Admin still makes the final link/merge call.

## 6. Why resolution verification?

**Problem:** "mark as resolved" is the one action an org member can take that
ends the citizen's complaint — a perfect abuse/fraud surface (claiming work
that wasn't done).

**Solution:** when an issue is RESOLVED with a proof photo, the worker compares
proof vs original report photo: "is it actually fixed?" Validated: resubmitting
the same pothole photo as proof returned NOT FIXED at 1.00 with an explicit
reason; a photo of a different spot returned UNCLEAR (conservative — never
guesses "fixed" from mismatched scenes). Flagged results surface in the admin
verification overview.

## 7. Why fake-photo guards at upload time?

**Problem:** screenshots of other apps' photos, and re-uploads of existing
photos, pollute the platform and poison the auto-fill pipeline.

**Solution:** `check-photo` runs before auto-fill: a vision check for
"photo of a screen?" plus a perceptual hash (sharp average-hash, Hamming
distance) against recent issue photos for "was this already reported?".
Validated: a byte-identical re-upload matched its originals at distance 0.

## 8. Why tests?

The vitest suite (9 tests) is small but it already paid for itself: the
freshness-decay test caught the implementation hitting its 0.4 floor at 3.4
years instead of the intended 5 — a silent confidence miscalibration that
would have been invisible without the test. The og repo had "no test suite
yet" in its README; that was the biggest credibility gap for a platform being
shown to judges.

## 9. What was tried and scrapped: the trained detector (YOLO)

**Why it was tried:** the proposal wanted a lightweight local ML model, and a
trained detector sounded like it could cheaply pre-classify photos.

**What the evidence showed (all measured):**
- A YOLO11n trained on RDD2020 India + streetlight/manhole sets reached
  mAP50 0.69 on its own test split — but on **unseen real-world photos** it
  missed every wide-scene pothole (zero detections even at 0.05 confidence)
  and its scene-level classes (broken_streetlight, open_manhole — trained on
  full-image boxes) fired false positives on generic urban scenes.
- The one thing it did well — close-up road-defect shots — is a small slice,
  and the cloud vision model already handles that with better quality.

**Decision:** scrapped. The trained model, its ~10 GB of datasets, the ONNX
runtime integration, and the street-imagery "discovery" pass that depended on
it (CANDIDATE issues) were all removed from the repo. The engine runs entirely
on the cloud vision model. Revisit only if a future use case needs
high-volume cheap scanning of imagery at scale — then the cost equation
(≈1 ms/image vs ≈10 s/call) changes the math.

## 10. What was deliberately NOT done (and why)

- **Satellite imagery (Bhuvan/Planetary Computer)** — cannot see the problem
  classes; Bhuvan has no download API at all.
- **Auto-accept of anything** — never. Every AI verdict is evidence for a
  human decision.
- **i18n, PWA camera, WhatsApp multi-photo** — deferred: separate bridge repo
  for WhatsApp, and i18n is a large deliberate change best done as its own
  effort.
- **Ola Maps key setup by default** — Krutrim Cloud requires a card + autopay
  mandate to create credentials. That is a financial decision for the
  platform owner; the code path is ready and documented, and Mapillary
  (free, email-only) is the recommended no-card upgrade.

---

## Bottom line for the next developer

Everything here is replaceable by design: every pass has a flag, every provider
has a fallback, every AI verdict is evidence for a human decision. Read the
reference doc for the mechanics and this doc for the reasoning — then decide
what this platform should trust the AI with.
