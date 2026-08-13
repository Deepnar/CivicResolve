import type { NextRequest } from 'next/server'
import { AuthUtils } from '@/lib/auth-utils'
import { Database } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await AuthUtils.requireAuth(request)
    if (user.role !== 'ADMIN') {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get duplicate stats
    const statsRows = await Database.query(`
      SELECT 
        (SELECT COUNT(*) FROM issues WHERE possible_duplicate_of IS NOT NULL) as total_linked,
        (SELECT COUNT(*) FROM issues WHERE duplicate_status = 'MERGED') as confirmed_duplicates,
        (SELECT COUNT(*) FROM issues WHERE possible_duplicate_of IS NOT NULL AND duplicate_status = 'PENDING') as pending_review,
        (SELECT COUNT(*) FROM duplicate_relationships) as total_relationships,
        (SELECT COUNT(*) FROM duplicate_detection_audit) as total_audits,
        (SELECT COUNT(*) FROM duplicate_ignore_pairs) as total_ignored
    `) as any[]

    // Get linked issue groups (root issues with their duplicate counts)
    const groupRows = await Database.query(`
      SELECT 
        root.id as root_id,
        root.title as root_title,
        root.category,
        root.status,
        root.address,
        u.name as reporter_name,
        COUNT(dup.id) as linked_count,
        SUM(COALESCE((SELECT COUNT(*) FROM votes v WHERE v.issue_id = dup.id), 0)) + 
          COALESCE((SELECT COUNT(*) FROM votes v WHERE v.issue_id = root.id), 0) as combined_votes,
        root.created_at
      FROM issues root
      INNER JOIN issues dup ON dup.possible_duplicate_of = root.id
      LEFT JOIN users u ON root.reporter_id = u.id
      GROUP BY root.id
      ORDER BY linked_count DESC
      LIMIT 50
    `) as any[]

    // Get recent audit actions
    const auditRows = await Database.query(`
      SELECT 
        a.id,
        a.issue_id,
        a.action_type,
        a.details,
        a.created_at,
        u.name as action_by_name,
        i.title as issue_title
      FROM duplicate_detection_audit a
      LEFT JOIN users u ON a.performed_by = u.id
      LEFT JOIN issues i ON a.issue_id = i.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `) as any[]

    return Response.json({
      stats: statsRows[0] || {},
      groups: groupRows || [],
      recentAudit: auditRows || [],
    })
  } catch (error) {
    logger.error('Error fetching duplicate stats', error instanceof Error ? error : undefined, 'admin')
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
