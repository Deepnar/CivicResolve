// AI Observation Engine — shared verification core.
// Used by BOTH the /api/ai/verify-issue route and the background worker
// (scripts/verify-worker.mjs) so the logic never drifts. No DB access here —
// callers load the issue and persist the result themselves.
//
// Import-safe standalone: only depends on lib/imagery.ts and lib/ollama.ts
// (both alias-free), so plain Node can run it with type stripping.

import { getStreetImageNear, fetchImageAsBase64, type StreetImage } from './imagery.ts'
import { ollamaGenerate } from './ollama.ts'

// Imagery younger than this is treated as fully fresh (no confidence penalty).
const FRESH_DAYS = 365
// At this age the evidence confidence bottoms out (5-year-old imagery).
const MAX_AGE_DAYS = 5 * 365
const MIN_FRESHNESS = 0.4

/**
 * Freshness multiplier for evidence confidence, given the imagery age in days.
 * 1.0 while the photo is under a year old; linear decay down to a 0.4 floor
 * at 5 years. Unknown age (null) is treated as fully fresh (1.0) — the caller
 * decides how to surface "unknown capture date".
 */
export function computeFreshnessFactor(imageryAgeDays: number | null): number {
  if (imageryAgeDays === null) return 1
  if (imageryAgeDays <= FRESH_DAYS) return 1
  // Linear glide from 1.0 (fresh) to MIN_FRESHNESS across FRESH_DAYS → MAX_AGE_DAYS.
  const t = (imageryAgeDays - FRESH_DAYS) / (MAX_AGE_DAYS - FRESH_DAYS)
  return Math.max(MIN_FRESHNESS, 1 - (1 - MIN_FRESHNESS) * t)
}

export type VerificationVerdict = 'same_issue' | 'different_issue' | 'unclear' | 'no_issue'

export interface VerificationResult {
  verdict: VerificationVerdict
  confidence: number
  reason: string
  streetImage: {
    source: string
    url: string
    capturedAt: string | null
    distanceM: number | null
  }
  freshness: {
    imageryAgeDays: number | null
    freshnessFactor: number
    isStale: boolean
  }
}

const VERDICTS: VerificationVerdict[] = [
  'same_issue',
  'different_issue',
  'unclear',
  'no_issue',
]

const VERIFY_PROMPT = `You are a civic-issue verification assistant for India.
You are given TWO images:
- Image 1: the citizen's report photo of a civic issue.
- Image 2: an external street-level photo of the same location (from street-view imagery).

Compare them carefully and answer: is the issue the citizen reported actually visible in the external street image?

Rules:
- "same_issue": the same problem (pothole, garbage pile, broken light, waterlogging, etc.) is visible in both photos.
- "different_issue": the external image shows the location but not the reported problem (e.g. road looks fine, or a different problem is visible).
- "unclear": the external image is too dark, blurry, occluded, or too far away to judge.
- "no_issue": the citizen's photo does not appear to show a civic issue at all.
- IMPORTANT — the street-view imagery may be months or years old: if the area looks repaired/different, prefer "different_issue" over "unclear" when the road surface is clearly visible.
- Never guess. When in doubt, choose "unclear".

Return ONLY valid JSON:
{
  "verdict": "same_issue" | "different_issue" | "unclear" | "no_issue",
  "confidence": 0.0-1.0,
  "reason": "one or two sentences explaining the verdict"
}`

/**
 * Verifies a reported issue against external street imagery of its location.
 * Returns null when no provider has imagery near the location (the caller
 * decides how to surface that). Throws on provider/vision failures.
 */
export async function runVerification(opts: {
  lat: number
  lng: number
  citizenImageUrl: string
  radiusM?: number
}): Promise<VerificationResult | null> {
  // 1) External street imagery for the reported location.
  let streetImage: StreetImage | null = null
  try {
    streetImage = await getStreetImageNear(opts.lat, opts.lng, opts.radiusM ?? 50)
  } catch (err) {
    console.warn(`[VERIFY] imagery chain failed: ${(err as Error).message}`)
  }
  if (!streetImage) return null

  // 2) Freshness: how old is the evidence image? Old photos must never
  //    masquerade as a current confirmation of the issue.
  const capturedAt = streetImage.capturedAt ? new Date(streetImage.capturedAt) : null
  const imageryAgeDays = capturedAt
    ? Math.max(0, (Date.now() - capturedAt.getTime()) / 86_400_000)
    : null
  // freshnessFactor: 1.0 while fresh, then a linear decay with age down to
  // MIN_FRESHNESS at MAX_AGE_DAYS — confidence scales with photo age.
  const freshnessFactor = computeFreshnessFactor(imageryAgeDays)
  const isStale = freshnessFactor < 1

  // 3) Citizen photo + street photo → both to the vision model.
  const [citizenBase64, streetBase64] = await Promise.all([
    fetchImageAsBase64(opts.citizenImageUrl),
    fetchImageAsBase64(streetImage.imageUrl),
  ])

  const analysisText = await ollamaGenerate({
    messages: [
      { role: 'system', content: 'You are a careful, conservative civic verification assistant.' },
      { role: 'user', content: VERIFY_PROMPT },
    ],
    images: [citizenBase64, streetBase64],
    format: 'json',
    temperature: 0.2,
  })

  const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Vision model returned no parseable JSON: ${analysisText.slice(0, 200)}`)
  }
  const parsed = JSON.parse(jsonMatch[0])
  const verdict = VERDICTS.includes(parsed.verdict) ? parsed.verdict : 'unclear'
  let confidence = Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1)
  let reason = typeof parsed.reason === 'string' ? parsed.reason : ''

  // 4) Freshness correction: evidence confidence decays with photo age — an
  //    old street photo cannot support a confident verdict.
  if (isStale) {
    confidence = Math.round(confidence * freshnessFactor * 100) / 100
    reason = `${reason} (NOTE: the street photo is ${Math.round(imageryAgeDays as number)} days old — the area may have changed since it was captured.)`
  }

  return {
    verdict,
    confidence,
    reason,
    streetImage: {
      source: streetImage.source,
      url: streetImage.imageUrl,
      capturedAt: streetImage.capturedAt ?? null,
      distanceM: streetImage.distanceM ?? null,
    },
    freshness: {
      imageryAgeDays,
      freshnessFactor,
      isStale,
    },
  }
}

// ---------------------------------------------------------------------------
// Resolution verification — is the reported issue actually fixed?
// ---------------------------------------------------------------------------

export type ResolutionVerdict = 'fixed' | 'not_fixed' | 'unclear'

export interface ResolutionCheckResult {
  verdict: ResolutionVerdict
  confidence: number
  reason: string
}

const RESOLUTION_PROMPT = `You are a resolution auditor for a civic issues platform in India.
You are given TWO photos:
- Image 1: the ORIGINAL report photo, showing a civic issue (pothole, garbage pile, broken light, waterlogging, etc.).
- Image 2: a RESOLUTION PROOF photo, taken after the issue was supposedly fixed.

Answer: has the issue shown in Image 1 actually been FIXED in Image 2?

Rules:
- "fixed": the problem is gone — the road is repaired, garbage cleared, light working, etc. Minor cosmetic differences are fine; the DEFECT itself must be resolved.
- "not_fixed": the same or a similar defect is still clearly visible in Image 2.
- "unclear": the proof photo is too dark, blurry, from a different angle, or too far to judge.
- IMPORTANT: a photo of a DIFFERENT spot or a photo that cannot show the reported defect is "unclear", not "fixed".
- Never guess. When in doubt choose "unclear".

Return ONLY valid JSON:
{
  "verdict": "fixed" | "not_fixed" | "unclear",
  "confidence": 0.0-1.0,
  "reason": "one or two sentences"
}`

/**
 * Checks whether the reported issue appears fixed in the resolution proof.
 * Returns null when either photo fails to download. Throws on model failure.
 */
export async function verifyResolution(
  originalPhotoUrl: string,
  proofPhotoUrl: string
): Promise<ResolutionCheckResult | null> {
  const [a, b] = await Promise.all([
    fetchImageAsBase64(originalPhotoUrl).catch(() => null),
    fetchImageAsBase64(proofPhotoUrl).catch(() => null),
  ])
  if (!a || !b) return null

  const text = await ollamaGenerate({
    messages: [
      { role: 'system', content: 'You are a careful, conservative resolution auditor.' },
      { role: 'user', content: RESOLUTION_PROMPT },
    ],
    images: [a, b],
    format: 'json',
    temperature: 0.2,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Vision model returned no parseable JSON: ${text.slice(0, 200)}`)
  const parsed = JSON.parse(jsonMatch[0])

  const verdicts: ResolutionVerdict[] = ['fixed', 'not_fixed', 'unclear']
  const verdict = verdicts.includes(parsed.verdict) ? parsed.verdict : 'unclear'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1)
  const reason = typeof parsed.reason === 'string' ? parsed.reason : ''

  return { verdict, confidence, reason }
}
