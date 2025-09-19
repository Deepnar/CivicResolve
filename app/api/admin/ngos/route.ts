import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NGOModel, UserModel, UserNGOModel } from '@/lib/models';
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

// GET /api/admin/ngos - List all NGOs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view all NGOs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ngos = await NGOModel.getAll();
    
    return NextResponse.json({
      success: true,
      ngos
    });
  } catch (error) {
    console.error('Error fetching NGOs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ngos - Create new NGO
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create NGOs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      email, 
      phone, 
      address, 
      registration_number,
      contact_person
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'NGO name is required' },
        { status: 400 }
      );
    }

    // Check if NGO already exists
    const existingNGO = await NGOModel.findByName(name.trim());
    if (existingNGO) {
      return NextResponse.json(
        { error: 'NGO with this name already exists' },
        { status: 409 }
      );
    }

    const ngoId = await NGOModel.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
      registration_number: registration_number?.trim() || undefined,
      contact_person: contact_person?.trim() || undefined,
    });

    // If email is provided, automatically assign NGO_ADMIN role to that user
    if (email) {
      try {
        const existingUser = await UserModel.checkUserByEmail(email.trim());
        if (existingUser) {
          // Update user role to NGO_ADMIN
          await UserModel.updateRole(existingUser.id, 'NGO_ADMIN');
          
          // Create user-NGO relationship
          await UserNGOModel.create({
            user_id: existingUser.id,
            ngo_id: ngoId,
            role: 'NGO_ADMIN',
            position: 'Administrator',
            assigned_by: user.id
          });
          
          console.log(`Automatically assigned NGO_ADMIN role to user ${email}`);
        } else {
          console.log(`User with email ${email} not found. NGO created but no role assigned.`);
        }
      } catch (error) {
        console.error('Error assigning NGO_ADMIN role:', error);
        // Continue even if role assignment fails - NGO is still created
      }
    }

    const newNGO = await NGOModel.findById(ngoId);

    // Invalidate NGO-related caches
    await safeInvalidateCache(['ngos', 'admin']);

    return NextResponse.json({
      success: true,
      ngo: newNGO,
      message: email ? 'NGO created successfully and NGO_ADMIN role assigned to contact email' : 'NGO created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating NGO:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}