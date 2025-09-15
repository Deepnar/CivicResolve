import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { IssueModel, UserModel } from '@/lib/models'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Get user's organization - this will check if user is a member
    const organizationId = await UserModel.getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'User is not associated with any organization' },
        { status: 403 }
      )
    }

    const issueModel = new IssueModel()

    // Get organization statistics
    const stats = await IssueModel.getOrganizationStats(organizationId)
    
    // Get recent issues for this organization
    const recentIssues = await IssueModel.getOrganizationRecentIssues(organizationId, 5)
    
    // Get organization details
    const organizationDetails = await IssueModel.getOrganizationDetails(organizationId)

    return NextResponse.json({
      stats,
      recentIssues,
      organizationDetails
    })

  } catch (error) {
    console.error('Error fetching organization dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
