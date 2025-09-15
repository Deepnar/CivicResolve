import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserModel, UserOrganizationModel } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get user from token
async function getCurrentUser(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await UserModel.findById(decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
}

// GET /api/organizations/[id]/check-user?email=user@example.com
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const organizationId = parseInt(resolvedParams.id);
    if (isNaN(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    // Check permissions - admin or organization admin
    const isAdmin = user.role === 'ADMIN';
    const isOrgAdmin = await UserOrganizationModel.isOrganizationAdmin(user.id, organizationId);
    
    if (!isAdmin && !isOrgAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find the user by email
    const targetUser = await UserModel.findByEmail(email.trim().toLowerCase());
    
    if (!targetUser) {
      return NextResponse.json({
        success: true,
        userExists: false,
        message: 'User not found with this email'
      });
    }

    // Check if user is already in this organization
    const existingAssignment = await UserOrganizationModel.findByUserAndOrganization(
      targetUser.id, 
      organizationId
    );

    return NextResponse.json({
      success: true,
      userExists: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      alreadyAssigned: !!existingAssignment,
      existingAssignment: existingAssignment ? {
        role: existingAssignment.role,
        employee_id: existingAssignment.employee_id,
        position: existingAssignment.position,
      } : null
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
