import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserModel, OrganizationModel, CategoryOrganizationMappingModel, UserOrganizationModel } from '@/lib/models';
import { ISSUE_CATEGORIES } from '@/lib/constants';

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

// POST /api/organizations/[id]/categories - Add category mapping
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

    // Only admins can modify category mappings
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { category, is_primary = false } = body;

    // Validate category
    if (!category || !Object.keys(ISSUE_CATEGORIES).includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const existingMappings = await CategoryOrganizationMappingModel.getByCategory(category);
    const existingMapping = existingMappings.find(m => m.organization_id === organizationId);
    
    if (existingMapping) {
      return NextResponse.json(
        { error: 'Category is already mapped to this organization' },
        { status: 409 }
      );
    }

    // Create the mapping
    const mappingId = await CategoryOrganizationMappingModel.create({
      category,
      organization_id: organizationId,
      is_primary,
    });

    // If this is set as primary, update other mappings for this category
    if (is_primary) {
      await CategoryOrganizationMappingModel.setPrimary(category, organizationId);
    }

    const categoryMappings = await CategoryOrganizationMappingModel.getByOrganization(organizationId);

    return NextResponse.json({
      success: true,
      mapping: categoryMappings.find(m => m.id === mappingId),
      message: 'Category mapping created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id]/categories?category=ROADS - Remove category mapping
export async function DELETE(
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

    // Only admins can modify category mappings
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    await CategoryOrganizationMappingModel.remove(category, organizationId);

    return NextResponse.json({
      success: true,
      message: 'Category mapping removed successfully'
    });
  } catch (error) {
    console.error('Error removing category mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
