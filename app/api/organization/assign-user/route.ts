import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { UserModel, UserOrganizationModel } from '@/lib/models'

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
    const { userId, employeeId, position, role } = body

    // Validate required fields
    if (!userId || !employeeId) {
      return NextResponse.json(
        { error: 'User ID and Employee ID are required' },
        { status: 400 }
      )
    }

    // Check if user is already in this organization
    const existingAssignment = await UserOrganizationModel.findByUserAndOrganization(userId, organizationId)
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this organization' },
        { status: 409 }
      )
    }

    // Create the assignment
    await UserOrganizationModel.create({
      user_id: userId,
      organization_id: organizationId,
      role: role || 'MEMBER',
      employee_id: employeeId,
      position: position,
      assigned_by: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'User successfully assigned to organization'
    })

  } catch (error) {
    console.error('Error assigning user to organization:', error)
    return NextResponse.json(
      { error: 'Failed to assign user to organization' },
      { status: 500 }
    )
  }
}
