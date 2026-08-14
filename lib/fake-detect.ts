// AI Observation Engine — fake/abuse photo guards.
// 1) Screenshot detection: is the image a photo of a screen (rephoto of a
//    photo, phone screenshot) rather than a real photo of the world?
// 2) Perceptual hash (aHash): lets us detect the SAME photo being re-reported
//    from a different account/location.

import sharp from 'sharp'
import { ollamaGenerate } from './ollama'

// ---------------------------------------------------------------------------
// Perceptual hash (average hash, 16x16 grayscale → 256 bits)
// ---------------------------------------------------------------------------

export async function hashImage(imageBase64: string): Promise<string> {
  const { data } = await sharp(Buffer.from(imageBase64, 'base64'))
    .resize(16, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const avg = data.reduce((sum: number, v: number) => sum + v, 0) / data.length
  let bits = ''
  for (const v of data) bits += v >= avg ? '1' : '0'
  return bits
}

export function hammingDistance(a: string, b: string): number {
  const len = Math.min(a.length, b.length)
  let d = 0
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++
  return d
}

// Images whose hashes differ by at most this many bits are "the same photo".
export const REUSE_HAMMING_THRESHOLD = 12

// ---------------------------------------------------------------------------
// Screenshot / screen-rephoto detection (VLM)
// ---------------------------------------------------------------------------

export interface ScreenshotCheck {
  isScreenshot: boolean
  confidence: number
  reason: string
}

const SCREENSHOT_PROMPT = `You are a photo-authenticity inspector for a civic issues platform.
Is this image a PHOTO OF A SCREEN — i.e. a screenshot of another photo, a photo taken of a phone/monitor showing another image, a digital render, or a zoomed-in screenshot of a map/video — OR a real photo taken in the physical world?

Signs of a screen photo: moire patterns, screen glare, curved screen edges, pixel grid, UI elements (status bar, buttons, cursors), watermark text overlays.
A real photo may still be low quality, dark, or blurry — that does NOT make it a screenshot.

Return ONLY valid JSON:
{"isScreenshot": true/false, "confidence": 0.0-1.0, "reason": "one sentence"}`

export async function detectScreenshot(imageBase64: string): Promise<ScreenshotCheck> {
  const text = await ollamaGenerate({
    messages: [
      { role: 'system', content: 'You are a careful photo-authenticity inspector.' },
      { role: 'user', content: SCREENSHOT_PROMPT },
    ],
    images: [imageBase64],
    format: 'json',
    temperature: 0,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Vision model returned no parseable JSON: ${text.slice(0, 200)}`)
  const parsed = JSON.parse(jsonMatch[0])
  return {
    isScreenshot: parsed.isScreenshot === true,
    confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
    reason: typeof parsed.reason === 'string' ? parsed.reason : '',
  }
}
