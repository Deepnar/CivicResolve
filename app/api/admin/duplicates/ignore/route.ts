/**
 * POST /api/admin/duplicates/ignore
 * Ignore a duplicate detection (mark as false positive)
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { AuthUtils, Database } from '@/lib/db'
import { 
  IssueModel, 
  DuplicateRelationshipModel, 
  DuplicateDetectionAuditModel
} from '@/lib/models'
import { serverCacheInvalidate } from '@/lib/server-cache'
import { logger } from '@/lib/logger'
import { PerformanceMonitor } from '@/lib/performance'

const ignoreSchema = z.object({
  original_issue_id: z.number().int().positive(),
  duplicate_issue_id: z.number().int().positive(),
  admin_comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/admin/duplicates/ignore')

  try {
    // Require admin authentication
    const user = await AuthUtils.requireAuth(request)
    
    if (user.role !== 'ADMIN') {
      return Response.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = ignoreSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { original_issue_id, duplicate_issue_id, admin_comment } = validationResult.data

    // Verify both issues exist
    const originalIssue = await IssueModel.findById(original_issue_id)
    const duplicateIssue = await IssueModel.findById(duplicate_issue_id)

    if (!originalIssue || !duplicateIssue) {
      return Response.json(
        { error: 'One or both issues not found' },
        { status: 404 }
      )
    }

    logger.info(
      `Admin ${user.name} ignoring duplicate detection: Issue #${duplicate_issue_id} is NOT a duplicate of #${original_issue_id}`
    )

    // Update duplicate issue status
    await Database.update(
      `UPDATE issues 
       SET duplicate_status = 'IGNORED',
           possible_duplicate_of = NULL,
           duplicate_confidence = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [duplicate_issue_id]
    )

    // Create duplicate relationship record
    const similarity_score = (duplicateIssue as any).duplicate_confidence || undefined

    await DuplicateRelationshipModel.create({
      original_issue_id,
      duplicate_issue_id,
      action: 'IGNORED',
      admin_id: user.id,
      admin_comment,
      similarity_score,
    })

    // Log to audit trail
    await DuplicateDetectionAuditModel.create({
      issue_id: duplicate_issue_id,
      action_type: 'IGNORED',
      performed_by: user.id,
      details: {
        original_issue_id,
        admin_comment,
        reason: 'Admin determined this is not a duplicate (false positive)',
      },
      similarity_score,
    })

    // Invalidate relevant caches
    await serverCacheInvalidate([`issue:${duplicate_issue_id}`, 'issues:*', 'admin:duplicates:*'])

    logger.info(
      `✅ Successfully ignored duplicate detection for issue #${duplicate_issue_id}`
    )

    endTimer()
    return Response.json({
      success: true,
      message: 'Duplicate detection ignored',
      duplicate_issue_id,
    })
  } catch (error) {
    endTimer()
    logger.error('Error ignoring duplicate detection', error instanceof Error ? error : undefined, 'admin')
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    return Response.json(
      { error: 'Failed to ignore duplicate detection' },
      { status: 500 }
    )
  }
}
