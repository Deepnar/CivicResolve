import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db } from '@/lib/database'
import { rateLimit, rateLimiters } from '@/lib/rate-limiter'
import { detectScreenshot, hashImage, hammingDistance, REUSE_HAMMING_THRESHOLD } from '@/lib/fake-detect'
import { fetchImageAsBase64 } from '@/lib/imagery'

const MAX_RECENT = 30
const LOOKBACK_DAYS = 30

// Guard a photo before it becomes an issue: screenshot? reused photo?
async function handler(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized', type: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let body: { imageUrl?: string; imageData?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Invalid JSON body', type: 'INVALID_BODY' } }, { status: 400 })
  }

  let base64: string | null = null
  if (body.imageData && typeof body.imageData === 'string') {
    // Server-side size cap (the client also enforces 5MB) — a crafted payload
    // must not allocate unbounded memory server-side.
    if (body.imageData.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { message: 'imageData exceeds the 5MB limit', type: 'INVALID_BODY' } },
        { status: 400 }
      )
    }
    base64 = body.imageData.includes(',') ? body.imageData.split(',')[1] : body.imageData
  } else if (body.imageUrl && typeof body.imageUrl === 'string') {
    // SSRF guard: only fetch from this app's own origin (relative paths or
    // the configured public URL). Arbitrary external URLs are rejected.
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'
    try {
      const parsed = new URL(body.imageUrl, appOrigin)
      const allowed = new URL(appOrigin)
      const isSameHost =
        parsed.hostname === allowed.hostname ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      if (!isSameHost) {
        return NextResponse.json(
          { success: false, error: { message: 'imageUrl must point to this app', type: 'INVALID_BODY' } },
          { status: 400 }
        )
      }
      base64 = await fetchImageAsBase64(parsed.toString()).catch(() => null)
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid imageUrl', type: 'INVALID_BODY' } },
        { status: 400 }
      )
    }
  }

  if (!base64) {
    return NextResponse.json({ success: false, error: { message: 'imageUrl or imageData is required', type: 'INVALID_BODY' } }, { status: 400 })
  }

  // 1) Screenshot / screen-rephoto check (VLM)
  let screenshot: { isScreenshot: boolean; confidence: number; reason: string } | null = null
  try {
    screenshot = await detectScreenshot(base64)
  } catch (err) {
    console.error('✗ [check-photo] screenshot detection failed:', err instanceof Error ? err.message : err)
  }

  // 2) Reused-photo check (perceptual hash vs recent issue images)
  let imageHash = ''
  let matches: { issueId: number; distance: number }[] = []
  try {
    imageHash = await hashImage(base64)
    const rows = await db.query<{ id: number; image_url: string }[]>(
      `SELECT id, image_url FROM issues
       WHERE image_url IS NOT NULL AND image_url <> ''
         AND created_at >= NOW() - INTERVAL ${LOOKBACK_DAYS} DAY
       ORDER BY created_at DESC
       LIMIT ${MAX_RECENT}`
    )

    for (const row of rows) {
      const other = await fetchImageAsBase64(
        row.image_url.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'}${row.image_url}` : row.image_url
      ).catch(() => null)
      if (!other) continue
      const distance = hammingDistance(imageHash, await hashImage(other))
      if (distance <= REUSE_HAMMING_THRESHOLD) matches.push({ issueId: row.id, distance })
    }
  } catch (err) {
    console.error('✗ [check-photo] reuse check failed:', err instanceof Error ? err.message : err)
  }

  const isReused = matches.length > 0
  const isScreenshot = screenshot?.isScreenshot ?? false

  let suggestedAction: 'ok' | 'warn_reused' | 'warn_screenshot' | 'reject' = 'ok'
  if (isScreenshot && (screenshot?.confidence ?? 0) >= 0.8) suggestedAction = 'reject'
  else if (isScreenshot) suggestedAction = 'warn_screenshot'
  else if (isReused) suggestedAction = 'warn_reused'

  return NextResponse.json({
    success: true,
    isScreenshot,
    screenshotConfidence: screenshot?.confidence ?? null,
    screenshotReason: screenshot?.reason ?? null,
    isReused,
    reuseMatches: matches.slice(0, 5),
    suggestedAction,
  })
}

export const POST = rateLimit(rateLimiters.ai, (req: Request) => {
  const user = (req as NextRequest & { user?: { id?: number | string } }).user
  return user ? `ai:${user.id}` : `ai:ip:${req.headers.get('x-forwarded-for') || 'unknown'}`
})(handler as unknown as (request: Request, ...args: any[]) => Promise<Response>)
