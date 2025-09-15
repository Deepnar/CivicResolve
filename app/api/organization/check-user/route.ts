import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { UserModel } from '@/lib/models'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user || user.role !== 'ORGANIZATION_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Organization admin access required' },
        { status: 401 }
      )
    }

    // Get user's organization
    const organizationId = await UserModel.getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'User is not associated with any organization' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { email } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await UserModel.checkUserByEmail(email)
    
    if (!existingUser) {
      return NextResponse.json(
        { 
          error: 'This email must already be registered before assignment.',
          userExists: false 
        },
        { status: 404 }
      )
    }

    if (!existingUser.is_verified) {
      return NextResponse.json(
        { 
          error: 'This user has not verified their email yet. They must verify their email before being assigned to an organization.',
          userExists: true,
          verified: false
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      userExists: true,
      verified: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role
      }
    })

  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    )
  }
}
