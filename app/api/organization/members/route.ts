import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { UserOrganizationModel, UserModel } from '@/lib/models'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an organization admin (only admins can assign issues)
    const organizationId = await UserModel.getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'User is not associated with any organization' },
        { status: 400 }
      )
    }

    // Verify user is organization admin
    if (user.role !== 'ORGANIZATION_ADMIN') {
      return NextResponse.json(
        { error: 'Organization admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')
    const statusFilter = searchParams.get('status')
    const search = searchParams.get('search')

    let members = await UserOrganizationModel.getOrganizationMembersWithStats(organizationId)

    // Apply filters
    if (roleFilter && roleFilter !== 'all') {
      members = members.filter(member => member.role === roleFilter)
    }

    if (statusFilter && statusFilter !== 'all') {
      members = members.filter(member => member.status === statusFilter)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      members = members.filter(member => 
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        (member.department && member.department.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({ members })

  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization members' },
      { status: 500 }
    )
  }
}
