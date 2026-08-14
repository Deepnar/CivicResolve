import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { IssueModel } from '@/lib/models'
import { runVerification } from '@/lib/verify-core'
import { rateLimit, rateLimiters } from '@/lib/rate-limiter'

// AI Observation Engine — external street-imagery verification.
// Thin HTTP wrapper over lib/verify-core.ts (the same core the background
// worker uses): auth + feature flag + issue lookup in, persisted evidence out.
// Pure evidence for humans — never auto-approves or auto-rejects an issue.

async function handler(request: NextRequest) {
  try {
    if (process.env.ENABLE_AI_VERIFICATION !== 'true') {
      return NextResponse.json(
        { error: 'AI verification is not enabled' },
        { status: 503 }
      )
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const issueId = Number(body?.issueId)
    if (!Number.isInteger(issueId) || issueId <= 0) {
      return NextResponse.json({ error: 'A valid issueId is required' }, { status: 400 })
    }

    const issue = await IssueModel.findById(issueId)
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Ownership/role guard: only the reporter, organization admins, and
    // system admins may (re)verify. Prevents evidence overwrites and
    // provider/vision quota burn by arbitrary logged-in users.
    const isReporter = String(issue.reporter_id) === String(user.id)
    const role = String(user.role)
    const isPrivileged = role === 'ADMIN' || role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_MEMBER'
    if (!isReporter && !isPrivileged) {
      return NextResponse.json(
        { error: 'Not authorized to verify this issue' },
        { status: 403 }
      )
    }

    // Throttle re-verification: skip if verified very recently (5 min).
    if (
      issue.verified_at &&
      Date.now() - new Date(issue.verified_at).getTime() < 5 * 60 * 1000
    ) {
      return NextResponse.json(
        { success: false, code: 'RECENTLY_VERIFIED', message: 'This issue was just verified — try again in a few minutes' },
        { status: 200 }
      )
    }

    const lat = Number(issue.latitude)
    const lng = Number(issue.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return NextResponse.json(
        { success: false, code: 'NO_VALID_LOCATION', message: 'Issue has no usable coordinates' },
        { status: 200 }
      )
    }

    const citizenImageUrl = issue.image_url
    if (!citizenImageUrl) {
      return NextResponse.json(
        { success: false, code: 'NO_CITIZEN_PHOTO', message: 'Issue has no attached photo' },
        { status: 200 }
      )
    }

    console.log(
      `🔎 [VERIFY] issue ${issueId} (${lat.toFixed(5)}, ${lng.toFixed(5)}) by user ${user.id}`
    )

    const result = await runVerification({
      lat,
      lng,
      citizenImageUrl: new URL(citizenImageUrl, request.url).toString(),
    })

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          code: 'NO_EXTERNAL_IMAGERY',
          message: 'No street-level imagery available near this location from any provider',
        },
        { status: 200 }
      )
    }

    // Persist the evidence on the issue row (idempotent).
    await IssueModel.saveVerification(issueId, {
      verdict: result.verdict,
      confidence: result.confidence,
      reason: result.reason,
      imageUrl: result.streetImage.url,
      source: result.streetImage.source,
      capturedAt: result.streetImage.capturedAt ? new Date(result.streetImage.capturedAt) : null,
      distanceM: result.streetImage.distanceM,
    })
    console.log(
      `✅ [VERIFY] issue ${issueId} → ${result.verdict} @ ${result.confidence.toFixed(2)} (stale: ${result.freshness.isStale})`
    )

    return NextResponse.json({
      success: true,
      verification: {
        verdict: result.verdict,
        confidence: result.confidence,
        reason: result.reason,
        streetImage: result.streetImage,
        freshness: result.freshness,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('🚨 [VERIFY] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify issue',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const POST = rateLimit(rateLimiters.ai, (req: Request) => {
  const user = (req as NextRequest & { user?: { id?: number | string } }).user
  return user ? `ai:${user.id}` : `ai:ip:${req.headers.get('x-forwarded-for') || 'unknown'}`
})(handler as unknown as (request: Request, ...args: any[]) => Promise<Response>)
