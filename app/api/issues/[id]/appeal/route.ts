import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { IssueModel, AppealModel, UserOrganizationModel } from '@/lib/models'
import { emailService } from '@/lib/email-service'
import { serverCacheInvalidate } from '@/lib/server-cache'

export async function POST(
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
    const issueId = parseInt(params.id)
    const body = await request.json()
    const { reason } = body

    // Validate input
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason for appeal is required' },
        { status: 400 }
      )
    }

    if (reason.length > 2000) {
      return NextResponse.json(
        { error: 'Reason must be less than 2000 characters' },
        { status: 400 }
      )
    }

    // Get the issue details
    const issue = await IssueModel.findById(issueId)
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      )
    }

    // Verify that the user is the original reporter of the issue
    if (issue.reporter_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the original reporter can appeal an issue' },
        { status: 403 }
      )
    }

    // Check if the issue status is either REJECTED or RESOLVED
    if (issue.status !== 'REJECTED' && issue.status !== 'RESOLVED') {
      return NextResponse.json(
        { 
          error: 'Invalid issue status for appeal',
          message: 'Only issues with REJECTED or RESOLVED status can be appealed'
        },
        { status: 400 }
      )
    }

    // Check if there isn't already an active appeal for this issue
    const hasActiveAppeal = await AppealModel.hasActiveAppeal(issueId)
    if (hasActiveAppeal) {
      return NextResponse.json(
        { 
          error: 'Active appeal already exists',
          message: 'There is already a pending or under review appeal for this issue'
        },
        { status: 400 }
      )
    }

    // Create the appeal
    const appealId = await AppealModel.create({
      issue_id: issueId,
      reporter_id: user.id,
      reason: reason.trim()
    })

    // Update the issue status to UNDER_APPEAL
    try {
      await IssueModel.updateStatus(issueId, 'UNDER_APPEAL')
    } catch (error) {
      console.error('Failed to update issue status to UNDER_APPEAL:', error)
      return NextResponse.json(
        { error: 'Failed to update issue status' },
        { status: 500 }
      )
    }

    // Get organization admins for email notification
    // Find which organization is assigned to this issue
    const organizationAdmins = await UserOrganizationModel.getOrganizationAdminsForIssue(issueId)

    // Send email notification to organization admins
    if (organizationAdmins && organizationAdmins.length > 0) {
      try {
        await emailService.sendAppealSubmittedNotification({
          issue: {
            id: issueId,
            title: issue.title,
            category: issue.category,
            address: issue.address
          },
          appeal: {
            id: appealId,
            reason: reason.trim(),
            reporter_name: user.name,
            reporter_email: user.email
          },
          admins: organizationAdmins.map(admin => ({
            email: admin.email,
            name: admin.name
          }))
        })
      } catch (emailError) {
        console.error('Failed to send appeal notification email:', emailError)
        // Don't fail the request if email fails, just log it
      }
    }

    // Invalidate relevant caches
    await serverCacheInvalidate(['issues', 'appeals', 'stats', 'analytics'])

    // Get the created appeal for response
    const createdAppeal = await AppealModel.findById(appealId)

    return NextResponse.json({
      message: 'Appeal submitted successfully',
      appeal: createdAppeal
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating appeal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}