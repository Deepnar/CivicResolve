import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { AppealModel, UserOrganizationModel } from '@/lib/models'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin or organization admin
    if (!['ADMIN', 'ORGANIZATION_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let appeals: any[] = []

    if (user.role === 'ADMIN') {
      // System admins can see all appeals
      appeals = await AppealModel.findAll()
    } else if (user.role === 'ORGANIZATION_ADMIN') {
      // Organization admins can only see appeals for their organization's issues
      const userOrgId = await UserOrganizationModel.getUserOrganizationId(user.id)
      
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'User is not associated with any organization' },
          { status: 400 }
        )
      }

      appeals = await AppealModel.findPendingAppealsForOrganization(userOrgId)
    }

    return NextResponse.json({
      appeals
    }, { status: 200 })

  } catch (error) {
    console.error('Error fetching admin appeals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}