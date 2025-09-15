import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserModel, OrganizationModel, UserOrganizationModel } from '@/lib/models';
import { emailService } from '@/lib/email-service';

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

// POST /api/organizations/[id]/assign-user - Add user to organization
export async function POST(
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

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { email, employee_id, position, role = 'MEMBER' } = body;

    // Validate required fields
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ORGANIZATION_ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ORGANIZATION_ADMIN or MEMBER' },
        { status: 400 }
      );
    }

    // Find the user by email
    const targetUser = await UserModel.findByEmail(email.trim().toLowerCase());
    if (!targetUser) {
      return NextResponse.json(
        { 
          error: 'This email must already be registered before assignment',
          userExists: false 
        },
        { status: 404 }
      );
    }

    // Check if user is already in this organization
    const existingAssignment = await UserOrganizationModel.findByUserAndOrganization(
      targetUser.id, 
      organizationId
    );
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this organization' },
        { status: 409 }
      );
    }

    // Create the assignment
    const assignmentId = await UserOrganizationModel.create({
      user_id: targetUser.id,
      organization_id: organizationId,
      role: role as 'ORGANIZATION_ADMIN' | 'MEMBER',
      employee_id: employee_id?.trim() || undefined,
      position: position?.trim() || undefined,
      assigned_by: user.id,
    });

    // Send welcome email notification
    try {
      await emailService.sendOrganizationWelcomeEmail(
        targetUser.email,
        targetUser.name,
        organization.name,
        role,
        user.name
      );
    } catch (emailError) {
      console.error('Failed to send organization welcome email:', emailError);
      // Continue with success response even if email fails
    }

    // Get the created assignment with user details
    const assignment = await UserOrganizationModel.getByOrganization(organizationId);
    const newAssignment = assignment.find(a => a.id === assignmentId);

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      message: 'User assigned to organization successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning user to organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
