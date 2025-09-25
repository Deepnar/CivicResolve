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

    const { issues, totalCount, stats } = await IssueModel.getOrganizationIssues(organizationId, filters);

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
