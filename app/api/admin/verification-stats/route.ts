import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db } from '@/lib/database'

// GET /api/admin/verification-stats — engine overview for the admin dashboard
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const summaryRows = await db.query<Record<string, unknown>[]>(
    `SELECT
       COUNT(*) AS total_issues,
       SUM(verified_at IS NOT NULL) AS verified,
       SUM(verification_verdict = 'same_issue') AS same_issue,
       SUM(verification_verdict = 'different_issue') AS different_issue,
       SUM(verification_verdict = 'no_issue') AS no_issue,
       SUM(verification_verdict = 'unclear') AS unclear,
       SUM(resolution_verdict = 'not_fixed') AS resolution_not_fixed,
       SUM(possible_duplicate_of IS NOT NULL AND duplicate_status = 'PENDING') AS duplicate_flags
     FROM issues`
  )

  const recentRows = await db.query<Record<string, unknown>[]>(
    `SELECT id, title, category, status, verification_verdict, verification_confidence,
            verification_source, verification_captured_at, verified_at,
            resolution_verdict, resolution_confidence
     FROM issues
     WHERE verified_at IS NOT NULL OR resolution_checked_at IS NOT NULL
     ORDER BY COALESCE(verified_at, updated_at) DESC
     LIMIT 20`
  )

  const s = summaryRows[0] || {}
  return NextResponse.json({
    stats: {
      totalIssues: Number(s.total_issues) || 0,
      verified: Number(s.verified) || 0,
      sameIssue: Number(s.same_issue) || 0,
      differentIssue: Number(s.different_issue) || 0,
      noIssue: Number(s.no_issue) || 0,
      unclear: Number(s.unclear) || 0,
      resolutionNotFixed: Number(s.resolution_not_fixed) || 0,
      duplicateFlags: Number(s.duplicate_flags) || 0,
    },
    recent: recentRows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      verificationVerdict: r.verification_verdict,
      verificationConfidence: r.verification_confidence,
      verificationSource: r.verification_source,
      verificationCapturedAt: r.verification_captured_at ? new Date(r.verification_captured_at as string) : null,
      verifiedAt: r.verified_at ? new Date(r.verified_at as string) : null,
      resolutionVerdict: r.resolution_verdict,
      resolutionConfidence: r.resolution_confidence,
    })),
  })
}
