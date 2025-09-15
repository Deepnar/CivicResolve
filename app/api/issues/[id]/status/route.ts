import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { IssueModel, UserModel, OrganizationModel } from '@/lib/models'
import { emailService } from '@/lib/email-service'

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

    // Check if user is part of an organization
    const organizationId = await UserModel.getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'User is not associated with any organization' },
        { status: 400 }
      )
    }

    const params = await context.params
    const issueId = parseInt(params.id)
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status transition
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the current issue details before updating
    const currentIssue = await IssueModel.findById(issueId)
    if (!currentIssue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      )
    }

    const oldStatus = currentIssue.status

    // Update the issue status
    await IssueModel.updateStatus(issueId, status)

    // Send email notification to the reporter about the status change
    try {
      // Get reporter details - handle both possible property names
      const reporterId = (currentIssue as any).reporterId || (currentIssue as any).reporter_id
      const reporter = await UserModel.findById(reporterId)
      
      // Get organization details
      const organization = await OrganizationModel.findById(organizationId)
      
      if (reporter && organization) {
        // Handle both possible property names for assigned_to_name
        const assignedToName = (currentIssue as any).assigned_to_name || (currentIssue as any).assignedToName || null
        
        await emailService.sendStatusUpdateNotificationEmail(
          reporter.email,
          reporter.name,
          issueId,
          {
            title: currentIssue.title,
            description: currentIssue.description,
            category: currentIssue.category,
            address: currentIssue.address,
            latitude: currentIssue.latitude,
            longitude: currentIssue.longitude,
            priority: (currentIssue as any).priority || "MEDIUM"
          },
          oldStatus,
          status,
          assignedToName,
          organization.name,
          user.name
        )
      }
    } catch (emailError) {
      console.error('Failed to send status update notification email:', emailError)
      // Continue with success response even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Issue status updated successfully'
    })

  } catch (error) {
    console.error('Error updating issue status:', error)
    return NextResponse.json(
      { error: 'Failed to update issue status' },
      { status: 500 }
    )
  }
}
