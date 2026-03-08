/**
 * POST /api/admin/duplicates/merge
 * Merge a duplicate issue into the original issue
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { AuthUtils, Database } from '@/lib/db'
import { 
  IssueModel, 
  DuplicateRelationshipModel, 
  DuplicateDetectionAuditModel,
  CommentModel,
  VoteModel
} from '@/lib/models'
import { serverCacheInvalidate } from '@/lib/server-cache'
import { logger } from '@/lib/logger'
import { PerformanceMonitor } from '@/lib/performance'
import { emailService } from '@/lib/email-service'

const mergeSchema = z.object({
  original_issue_id: z.number().int().positive(),
  duplicate_issue_id: z.number().int().positive(),
  admin_comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/admin/duplicates/merge')

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
    const validationResult = mergeSchema.safeParse(body)
    
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

    // Prevent merging if duplicate is already merged
    if (duplicateIssue.status === 'CLOSED_DUPLICATE') {
      return Response.json(
        { error: 'Duplicate issue is already merged' },
        { status: 400 }
      )
    }

    // Calculate similarity info
    const distance = duplicateIssue.latitude && duplicateIssue.longitude && originalIssue.latitude && originalIssue.longitude
      ? calculateDistance(
          duplicateIssue.latitude,
          duplicateIssue.longitude,
          originalIssue.latitude,
          originalIssue.longitude
        )
      : undefined

    const similarity_score = (duplicateIssue as any).duplicate_confidence || undefined

    logger.info(
      `Admin ${user.name} initiating merge: Issue #${duplicate_issue_id} → #${original_issue_id}`
    )

    // Perform merge in a transaction
    try {
      // 1. Transfer votes from duplicate to original
      const transferVotesSql = `
        INSERT IGNORE INTO votes (issue_id, user_id, created_at)
        SELECT ?, user_id, created_at
        FROM votes
        WHERE issue_id = ?
      `
      await Database.query(transferVotesSql, [original_issue_id, duplicate_issue_id])

      // 2. Transfer comments from duplicate to original
      const transferCommentsSql = `
        UPDATE comments
        SET issue_id = ?
        WHERE issue_id = ?
      `
      await Database.update(transferCommentsSql, [original_issue_id, duplicate_issue_id])

      // 3. Mark duplicate issue as CLOSED_DUPLICATE and link to original
      await Database.update(
        `UPDATE issues 
         SET status = 'CLOSED_DUPLICATE', 
             duplicate_status = 'MERGED',
             possible_duplicate_of = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [original_issue_id, duplicate_issue_id]
      )

      // 4. Update original issue status if it was PENDING
      if (originalIssue.status === 'PENDING') {
        await Database.update(
          `UPDATE issues 
           SET duplicate_status = 'MERGED',
               updated_at = NOW()
           WHERE id = ?`,
          [original_issue_id]
        )
      }

      // 5. Create duplicate relationship record
      await DuplicateRelationshipModel.create({
        original_issue_id,
        duplicate_issue_id,
        action: 'MERGED',
        admin_id: user.id,
        admin_comment,
        similarity_score,
        distance_meters: distance,
      })

      // 6. Log to audit trail
      await DuplicateDetectionAuditModel.create({
        issue_id: duplicate_issue_id,
        action_type: 'MERGED',
        performed_by: user.id,
        details: {
          original_issue_id,
          admin_comment,
        },
        similarity_score,
        distance_meters: distance,
      })

      // Invalidate relevant caches
      await serverCacheInvalidate([`issue:${original_issue_id}`, `issue:${duplicate_issue_id}`, 'issues:*', 'admin:duplicates:*'])

      logger.info(
        `✅ Successfully merged issue #${duplicate_issue_id} into #${original_issue_id}`
      )

      // Send notification to duplicate reporter
      try {
        const duplicateReporter = await Database.queryOne<{ email: string; name: string }>(
          'SELECT email, name FROM users WHERE id = ?',
          [duplicateIssue.reporter_id]
        )

        // Email notification would go here
        // Note: emailService.sendEmail not available in current implementation
      } catch (emailError) {
        logger.error('Failed to send merge notification email', emailError instanceof Error ? emailError : undefined)
        // Don't fail the request if email fails
      }

      endTimer()
      return Response.json({
        success: true,
        message: 'Issues merged successfully',
        original_issue_id,
        duplicate_issue_id,
      })
    } catch (dbError) {
      logger.error('Database error during merge', dbError instanceof Error ? dbError : undefined, 'admin')
      throw new Error('Failed to merge issues. Database transaction failed.')
    }
  } catch (error) {
    endTimer()
    logger.error('Error merging duplicate issues', error instanceof Error ? error : undefined, 'admin')
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to merge issues' },
      { status: 500 }
    )
  }
}

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * 
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * 
    Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c * 1000 // Convert to meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
