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
database every 10 minutes, covering **all** report paths. Four idempotent
passes: auto-verify, vision duplicates, resolution check, discovery. Each pass
has its own feature flag so the next developer can disable any piece without
touching code. The worker is installed as a systemd user timer (cron line
documented for servers).

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

## 8. Why auto-discovery (CANDIDATE issues)?

**Problem:** reactive-only platforms miss everything nobody reports. The
original proposal doc wanted "automated discovery of issues from imagery."

**Solution:** the worker's 4th pass scans street imagery near recently active
areas and runs the trained YOLO detector over each photo. Detections above the
calibrated threshold become **CANDIDATE** issues — a status that is invisible
to the public (excluded from every public list/map) and exists only in the
admin review queue. The AI never publishes: an admin clicks Accept (→ PENDING,
a real issue) or Reject. This is "auto-reporting" done responsibly.

## 9. Why a trained YOLO, and why it is scoped so narrowly?

**The honest numbers:**
- Vision model call: ~10–20 s + gateway cost per image.
- YOLO11n on ONNX: ~1 ms per image, free, runs anywhere (CPU/GPU).

**Decision:** train a lightweight detector for the high-volume scanning job
(discovery), keep the vision model for the judgment jobs (comparisons,
duplicates, resolution, ambiguity). Evidence from the unseen real-world eval:
the YOLO detects close-up road defects well (alligator crack at 0.33–0.47 on
a never-seen photo) but misses wide scenic shots of potholes, and the
scene-level classes (streetlight/manhole) fire false positives on generic
urban scenes — so they are calibrated ×0.5 at inference and never trusted for
localization. The vision model remains the accuracy layer; YOLO is a cheap
pre-filter. It is deliberately NOT wired into the app's per-report flows.

## 10. Why these datasets, why this class list?

Sources (all in `docs/dataset-plan.md` with licenses): RDD2020 India (7,706
images, the core road-defect set), Street-Light-Dataset, manhole covers,
RoadDefects-ISeg. Converted to one unified YOLO format with honest negatives
(clean roads, working lights, covered manholes — measured to improve
precision). Classes map to platform categories: pothole / longitudinal /
alligator crack (ROADS), broken_streetlight (LIGHTING), open_manhole
(UTILITIES). transverse_crack was dropped after training showed it dead
(94 boxes, mAP 0.07). Garbage has no trained class yet (TACO download was
blocked at research time) — garbage scenes correctly escalate to the vision
model instead of being misclassified.

## 11. Why tests?

The vitest suite (9 tests) is small but it already paid for itself: the
freshness-decay test caught the implementation hitting its 0.4 floor at 3.4
years instead of the intended 5 — a silent confidence miscalibration that
would have been invisible without the test. The og repo had "no test suite
yet" in its README; that was the biggest credibility gap for a platform being
shown to judges.

## 12. What was deliberately NOT done (and why)

- **YOLO in the app's per-report flows** — partial category coverage,
  scene-class false positives, duplicates the vision model's job. Cost doesn't
  justify it. (Revisit only for the discovery scanning volume case.)
- **Satellite imagery (Bhuvan/Planetary Computer)** — cannot see the problem
  classes; Bhuvan has no download API at all.
- **Auto-accept of AI discoveries** — never. Candidates only.
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
reference doc for the mechanics, this doc for the reasoning, and `docs/
dataset-plan.md` for the numbers — then decide what this platform should trust
the AI with.
