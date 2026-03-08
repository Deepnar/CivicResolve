/**
 * POST /api/admin/duplicates/separate
 * Mark two issues as separate (not duplicates) and prevent future flagging
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { AuthUtils, Database } from '@/lib/db'
import { 
  IssueModel, 
  DuplicateRelationshipModel, 
  DuplicateDetectionAuditModel,
  DuplicateIgnorePairModel
} from '@/lib/models'
import { serverCacheInvalidate } from '@/lib/server-cache'
import { logger } from '@/lib/logger'
import { PerformanceMonitor } from '@/lib/performance'

const separateSchema = z.object({
  original_issue_id: z.number().int().positive(),
  duplicate_issue_id: z.number().int().positive(),
  admin_comment: z.string().optional(),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/admin/duplicates/separate')

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
    const validationResult = separateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { original_issue_id, duplicate_issue_id, admin_comment, reason } = validationResult.data

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
      `Admin ${user.name} marking issues as separate: Issue #${duplicate_issue_id} and #${original_issue_id} are different issues`
    )

    // Update duplicate issue status
    await Database.update(
      `UPDATE issues 
       SET duplicate_status = 'SEPARATE',
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
      action: 'SEPARATE',
      admin_id: user.id,
      admin_comment,
      similarity_score,
    })

    // Add to ignore pairs to prevent future flagging
    await DuplicateIgnorePairModel.create({
      issue_id_1: original_issue_id,
      issue_id_2: duplicate_issue_id,
      added_by: user.id,
      reason: reason || admin_comment,
    })

    // Log to audit trail
    await DuplicateDetectionAuditModel.create({
      issue_id: duplicate_issue_id,
      action_type: 'SEPARATE',
      performed_by: user.id,
      details: {
        original_issue_id,
        admin_comment,
        reason,
        note: 'Issues marked as separate - will not be flagged as duplicates in future',
      },
      similarity_score,
    })

    // Invalidate relevant caches
    await serverCacheInvalidate([`issue:${original_issue_id}`, `issue:${duplicate_issue_id}`, 'issues:*', 'admin:duplicates:*'])

    logger.info(
      `✅ Successfully marked issues #${duplicate_issue_id} and #${original_issue_id} as separate`
    )

    endTimer()
    return Response.json({
      success: true,
      message: 'Issues marked as separate',
      original_issue_id,
      duplicate_issue_id,
    })
  } catch (error) {
    endTimer()
    logger.error('Error marking issues as separate', error instanceof Error ? error : undefined, 'admin')
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    return Response.json(
      { error: 'Failed to mark issues as separate' },
      { status: 500 }
    )
  }
}
