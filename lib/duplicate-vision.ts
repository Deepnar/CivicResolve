// AI Observation Engine — vision-based duplicate checking.
// Compares two issue photos and asks the vision model whether they show the
// SAME problem (e.g. the same pothole reported twice). Used by the background
// worker's duplicate sweep to upgrade the text/location duplicate detection
// with visual evidence. Import-safe standalone (only depends on lib/ollama.ts).

import { ollamaGenerate } from './ollama.ts'
import { fetchImageAsBase64 } from './imagery.ts'

export interface DuplicateVisionResult {
  same: boolean
  confidence: number
  reason: string
}

const PROMPT = `You are a duplicate-report detector for a civic issues platform in India.
You are given TWO photos that may or may not show the SAME civic problem (pothole, garbage pile, broken light, waterlogging, etc.) — possibly reported by different people at slightly different times/angles.

Answer: do both photos show the SAME instance of the SAME problem (same pothole, same garbage pile, same damaged sign)?

Rules:
- "true": same problem instance visible in both photos — this is a duplicate report.
- "false": different problems, or the same kind of problem at different locations/instances.
- "unclear": photos too dark, blurry, or too different in framing to judge.
- When the exact same object/defect is visible (same crack pattern, same pile, same broken sign) prefer "true".
- Never guess. When in doubt choose "unclear".

Return ONLY valid JSON:
{
  "verdict": "true" | "false" | "unclear",
  "confidence": 0.0-1.0,
  "reason": "one or two sentences"
}`

/**
 * Vision duplicate check between two issue photos. Returns null when either
 * photo fails to download. Throws on vision-model failure.
 */
export async function visionCheckSameIssue(
  photoAUrl: string,
  photoBUrl: string
): Promise<DuplicateVisionResult | null> {
  const [a, b] = await Promise.all([
    fetchImageAsBase64(photoAUrl).catch(() => null),
    fetchImageAsBase64(photoBUrl).catch(() => null),
  ])
  if (!a || !b) return null

  const text = await ollamaGenerate({
    messages: [
      { role: 'system', content: 'You are a careful duplicate-report detector.' },
      { role: 'user', content: PROMPT },
    ],
    images: [a, b],
    format: 'json',
    temperature: 0.2,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Vision model returned no parseable JSON: ${text.slice(0, 200)}`)
  const parsed = JSON.parse(jsonMatch[0])

  const verdict = parsed.verdict
  const same = verdict === 'true'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1)
  const reason = typeof parsed.reason === 'string' ? parsed.reason : ''

  return { same, confidence, reason }
}
