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
    const rawRecentIssues = await IssueModel.getOrganizationRecentIssues(organizationId, 5)
    
    // Transform recent issues to match Flutter's expected structure
    const recentIssues = rawRecentIssues.map((issue: any) => ({
      id: issue.id.toString(),
      title: issue.title,
      description: issue.description,
      category: issue.category,
      status: issue.status,
      priority: issue.priority,
      latitude: Number(issue.latitude),
      longitude: Number(issue.longitude),
      address: issue.address,
      imageUrl: issue.image_url,
      resolutionImageUrl: issue.resolution_image_url,
      reporterId: issue.reporter_id?.toString(),
      isAnonymous: issue.is_anonymous || false,
      reporter: {
        id: issue.reporter_id?.toString(),
        name: issue.citizen_name || 'Unknown',  // Already masked from SQL
        email: '', // Never expose email
        role: issue.reporter_role || 'CITIZEN',
        points: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      votes_count: issue.votes || 0,
      comments_count: issue.comments || 0,
      createdAt: issue.created_at ? new Date(issue.created_at).toISOString() : new Date().toISOString(),
      updatedAt: issue.updated_at ? new Date(issue.updated_at).toISOString() : new Date().toISOString()
    }))
    
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
