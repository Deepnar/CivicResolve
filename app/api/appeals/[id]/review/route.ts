import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { AppealModel, IssueModel, UserOrganizationModel } from '@/lib/models'
import { emailService } from '@/lib/email-service'
import { serverCacheInvalidate } from '@/lib/server-cache'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const params = await context.params
    const appealId = parseInt(params.id)
    const body = await request.json()
    const { decision, comment } = body

    // Validate input
    if (!decision || !['ACCEPTED', 'DENIED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be either ACCEPTED or DENIED' },
        { status: 400 }
      )
    }

    if (comment && typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'Comment must be a string' },
        { status: 400 }
      )
    }

    if (comment && comment.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be less than 2000 characters' },
        { status: 400 }
      )
    }

    // Get the appeal details
    const appeal = await AppealModel.findById(appealId)
    if (!appeal) {
      return NextResponse.json(
        { error: 'Appeal not found' },
        { status: 404 }
      )
    }

    // Check if appeal is in a reviewable state
    if (!['PENDING', 'UNDER_REVIEW'].includes(appeal.status)) {
      return NextResponse.json(
        { 
          error: 'Appeal not reviewable',
          message: 'Only appeals with PENDING or UNDER_REVIEW status can be reviewed'
        },
        { status: 400 }
      )
    }

    // Get the issue details to check current status
    const issue = await IssueModel.findById(appeal.issue_id)
    if (!issue) {
      return NextResponse.json(
        { error: 'Associated issue not found' },
        { status: 404 }
      )
    }

    // Verify the issue is currently under appeal
    if (issue.status !== 'UNDER_APPEAL') {
      return NextResponse.json(
        { 
          error: 'Issue not under appeal',
          message: 'This issue is not currently under appeal and cannot be reviewed'
        },
        { status: 400 }
      )
    }

    // Verify user authorization - must be ORGANIZATION_ADMIN of assigned organization
    if (user.role !== 'ADMIN') {
      // Get user's organization ID
      const userOrgId = await UserOrganizationModel.getUserOrganizationId(user.id)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'User is not associated with any organization' },
          { status: 403 }
        )
      }

      // Check if user's organization is assigned to this issue
      const isAuthorized = await UserOrganizationModel.isUserAuthorizedForIssue(user.id, appeal.issue_id)
      if (!isAuthorized) {
        return NextResponse.json(
          { 
            error: 'Unauthorized to review this appeal',
            message: 'You can only review appeals for issues assigned to your organization'
          },
          { status: 403 }
        )
      }

      // Verify user has admin role in organization
      if (user.role !== 'ORGANIZATION_ADMIN') {
        return NextResponse.json(
          { error: 'Only organization admins can review appeals' },
          { status: 403 }
        )
      }
    }

    // Store the original issue status - we'll determine this based on context
    // For now, if decision is DENIED, we'll return to REJECTED as default
    // In a more sophisticated system, we'd store the original status in the appeal
    let newIssueStatus: string
    if (decision === 'ACCEPTED') {
      newIssueStatus = 'PENDING' // Reopen the issue for review
    } else {
      // Return to a reasonable default status
      // In most cases, appeals are for REJECTED or RESOLVED issues
      // We'll default to REJECTED for DENIED appeals
      newIssueStatus = 'REJECTED'
    }

    // Update the appeal status
    const updateSuccess = await AppealModel.updateStatus(
      appealId,
      decision,
      user.id,
      comment?.trim() || null
    )

    if (!updateSuccess) {
      return NextResponse.json(
        { error: 'Failed to update appeal status' },
        { status: 500 }
      )
    }

    await IssueModel.updateStatus(appeal.issue_id, newIssueStatus)

    // Get updated appeal details for email notification
    const updatedAppeal = await AppealModel.findById(appealId)
    
    // Send email notification to the reporter
    try {
      await emailService.sendAppealDecisionNotification({
        appeal: {
          id: appealId,
          status: decision,
          reviewer_comment: comment?.trim() || null
        },
        issue: {
          id: issue.id,
          title: issue.title,
          category: issue.category,
          address: issue.address
        },
        reporter: {
          email: (updatedAppeal as any)?.reporter_email || '',
          name: (updatedAppeal as any)?.reporter_name || 'Citizen'
        },
        reviewer: {
          name: user.name
        }
      })
    } catch (emailError) {
      console.error('Failed to send appeal decision notification email:', emailError)
      // Don't fail the request if email fails, just log it
    }

    // Invalidate relevant caches
    await serverCacheInvalidate(['issues', 'appeals', 'stats', 'analytics'])

    return NextResponse.json({
      message: `Appeal ${decision.toLowerCase()} successfully`,
      appeal: updatedAppeal
    }, { status: 200 })

  } catch (error) {
    console.error('Error reviewing appeal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}