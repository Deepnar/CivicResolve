import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { UserModel } from '@/lib/models'

export async function GET(request: NextRequest) {
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
    const isOrganizationMember = !!organizationId

    return NextResponse.json({ 
      isOrganizationMember,
      organizationId: organizationId || null
    })

  } catch (error) {
    console.error('Error checking organization status:', error)
    return NextResponse.json(
      { error: 'Failed to check organization status' },
      { status: 500 }
    )
  }
}
