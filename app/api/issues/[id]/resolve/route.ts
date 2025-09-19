import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { IssueModel, UserModel, OrganizationModel, UserOrganizationModel } from '@/lib/models'
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
    const { resolutionImageUrl } = body

    if (!resolutionImageUrl) {
      return NextResponse.json(
        { error: 'Resolution photo is required to mark issue as resolved' },
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

    // Check if issue is already resolved
    if (currentIssue.status === 'RESOLVED') {
      return NextResponse.json(
        { error: 'Issue is already resolved' },
        { status: 400 }
      )
    }

    const oldStatus = currentIssue.status

    // Resolve the issue with the provided image
    console.log(`🔄 [RESOLVE ISSUE] Resolving issue ${issueId} with photo: ${resolutionImageUrl}`)
    await IssueModel.resolveWithImage(issueId, resolutionImageUrl)
    console.log(`✅ [RESOLVE ISSUE] Issue resolved successfully with photo`)

    // Invalidate cache after resolving
    console.log(`🗑️ [RESOLVE ISSUE] **CACHE INVALIDATION TRIGGERED** - Issue resolved`)
    console.log(`🎯 [RESOLVE ISSUE] About to invalidate cache tags: ['issues', 'stats', 'analytics']`)
    await serverCacheInvalidate(['issues', 'stats', 'analytics'])
    console.log(`✅ [RESOLVE ISSUE] Cache invalidation completed - fresh data will be fetched on next request`)

    // Send email notification to the reporter about the resolution
    try {
      // Get reporter details - handle both possible property names
      const reporterId = (currentIssue as any).reporterId || (currentIssue as any).reporter_id
      const reporter = await UserModel.findById(reporterId)
      
      // Get organization details
      const organization = await OrganizationModel.findById(organizationId)
      
      if (reporter && organization) {
        // Get the actual employee ID from user_organizations table
        const assignedToUserId = (currentIssue as any).assigned_to || (currentIssue as any).assignedTo || null
        let employeeId = null;
        
        if (assignedToUserId) {
          employeeId = await UserOrganizationModel.getEmployeeId(assignedToUserId, organizationId);
        }
        
        // Get the employee ID of the user making the update
        let resolvedByEmployeeId = null;
        if (user.id && organizationId) {
          resolvedByEmployeeId = await UserOrganizationModel.getEmployeeId(user.id, organizationId);
        }
        
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
          'RESOLVED',
          employeeId,
          organization.name,
          resolvedByEmployeeId
        )
      }
    } catch (emailError) {
      console.error('Failed to send resolution notification email:', emailError)
      // Continue with success response even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Issue resolved successfully with photo proof',
      resolutionImageUrl
    })

  } catch (error) {
    console.error('Error resolving issue with photo:', error)
    return NextResponse.json(
      { error: 'Failed to resolve issue' },
      { status: 500 }
    )
  }
}