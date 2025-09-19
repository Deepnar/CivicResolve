import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NGOModel, UserModel } from '@/lib/models';
import { safeInvalidateCache } from '@/lib/cache-helper';

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

// PUT /api/admin/ngos/[id] - Update NGO
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update NGOs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const ngoId = parseInt(id);
    if (isNaN(ngoId)) {
      return NextResponse.json({ error: 'Invalid NGO ID' }, { status: 400 });
    }

    // Check if NGO exists
    const existingNGO = await NGOModel.findById(ngoId);
    if (!existingNGO) {
      return NextResponse.json({ error: 'NGO not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      email, 
      phone, 
      address, 
      registration_number,
      contact_person,
      website,
      focus_areas,
      is_active
    } = body;

    // Validate name if provided
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'NGO name cannot be empty' },
        { status: 400 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingNGO.name) {
      const duplicateNGO = await NGOModel.findByName(name.trim());
      if (duplicateNGO) {
        return NextResponse.json(
          { error: 'NGO with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Validate focus areas if provided
    if (focus_areas && (!Array.isArray(focus_areas) || focus_areas.some(area => typeof area !== 'string'))) {
      return NextResponse.json(
        { error: 'Focus areas must be an array of strings' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (registration_number !== undefined) updateData.registration_number = registration_number?.trim() || null;
    if (contact_person !== undefined) updateData.contact_person = contact_person?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (focus_areas !== undefined) updateData.focus_areas = focus_areas;
    if (is_active !== undefined) updateData.is_active = is_active;

    const success = await NGOModel.update(ngoId, updateData);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update NGO' }, { status: 500 });
    }

    const updatedNGO = await NGOModel.findById(ngoId);

    // Invalidate NGO-related caches
    await safeInvalidateCache(['ngos', 'admin', `ngo:${ngoId}`]);

    return NextResponse.json({
      success: true,
      ngo: updatedNGO,
      message: 'NGO updated successfully'
    });
  } catch (error) {
    console.error('Error updating NGO:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ngos/[id] - Deactivate NGO
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can deactivate NGOs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const ngoId = parseInt(id);
    if (isNaN(ngoId)) {
      return NextResponse.json({ error: 'Invalid NGO ID' }, { status: 400 });
    }

    // Check if NGO exists
    const existingNGO = await NGOModel.findById(ngoId);
    if (!existingNGO) {
      return NextResponse.json({ error: 'NGO not found' }, { status: 404 });
    }

    console.log(`🗑️ [NGO DELETE] Attempting to delete NGO ${ngoId}: ${existingNGO.name}`);

    const success = await NGOModel.delete(ngoId);
    
    if (!success) {
      console.error(`❌ [NGO DELETE] Failed to delete NGO ${ngoId}`);
      return NextResponse.json({ error: 'Failed to deactivate NGO' }, { status: 500 });
    }

    console.log(`✅ [NGO DELETE] Successfully deleted NGO ${ngoId}`);

    // Invalidate NGO-related caches
    try {
      await safeInvalidateCache(['ngos', 'admin', `ngo:${ngoId}`]);
      console.log(`🗃️ [NGO DELETE] Cache invalidated for NGO ${ngoId}`);
    } catch (cacheError) {
      console.error(`⚠️ [NGO DELETE] Cache invalidation failed:`, cacheError);
      // Continue anyway - cache invalidation failure shouldn't fail the delete
    }

    return NextResponse.json({
      success: true,
      message: 'NGO deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating NGO:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}