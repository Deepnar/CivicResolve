import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { OrganizationModel, UserModel, UserOrganizationModel, CategoryOrganizationMappingModel } from '@/lib/models';

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

// GET /api/organizations/[id] - Get specific organization with members and categories
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

    // Check permissions - admin or organization member
    const isAdmin = user.role === 'ADMIN';
    const userOrg = await UserOrganizationModel.findByUserAndOrganization(user.id, organizationId);
    
    if (!isAdmin && !userOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get organization members
    const members = await UserOrganizationModel.getByOrganization(organizationId);
    
    // Get category mappings
    const categoryMappings = await CategoryOrganizationMappingModel.getByOrganization(organizationId);

    return NextResponse.json({
      success: true,
      organization,
      members,
      categoryMappings
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[id] - Update organization
export async function PUT(
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
    const { name, description, email, phone, address, is_active } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Organization name cannot be empty' },
          { status: 400 }
        );
      }

      // Check if name is taken by another organization
      const existingOrg = await OrganizationModel.findByName(name.trim());
      if (existingOrg && existingOrg.id !== organizationId) {
        return NextResponse.json(
          { error: 'Organization with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Only super admin can deactivate organizations
    if (is_active !== undefined && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can activate/deactivate organizations' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    await OrganizationModel.update(organizationId, updateData);

    const updatedOrganization = await OrganizationModel.findById(organizationId);

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id] - Delete (deactivate) organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can delete organizations
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const organizationId = parseInt(resolvedParams.id);
    if (isNaN(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await OrganizationModel.delete(organizationId);

    return NextResponse.json({
      success: true,
      message: 'Organization deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
