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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      priority: searchParams.get('priority') || undefined,
      search: searchParams.get('search') || undefined,
      limit,
      offset
    }

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters]
      }
    })

    const { issues: rawIssues, totalCount, stats } = await IssueModel.getOrganizationIssues(organizationId, filters);

    // Transform issues to match Flutter's expected structure
    const issues = rawIssues.map((issue: any) => ({
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
        email: issue.citizen_email || '',
        role: issue.reporter_role || 'CITIZEN',
        points: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      votes_count: issue.votes || 0,
      comments_count: issue.comments || 0,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at)
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return NextResponse.json({
      issues,
      totalCount,
      totalPages,
      currentPage,
      stats
    });
  } catch (error) {
    console.error('Error fetching organization issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization issues' },
      { status: 500 }
    )
  }
}
