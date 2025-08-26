import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { UserModel } from './models';

// Use environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_make_it_very_long_and_secure';

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your_jwt_secret_key_here_make_it_very_long_and_secure') {
  console.warn('⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET environment variable.');
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Edge-compatible JWT verification for middleware
export function verifyJWTForEdge(token: string): JWTPayload | null {
  try {
    // Simple JWT parsing for Edge Runtime (no crypto verification)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

export class AuthUtils {
  static generateToken(user: { id: number; email: string; role: string }): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const result = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return result;
    } catch (error) {
      return null;
    }
  }

  static async getCurrentUser(request: NextRequest) {
    try {
      // Check both Authorization header and cookies
      let token: string | undefined;
      
      const authorization = request.headers.get('authorization');
      if (authorization && authorization.startsWith('Bearer ')) {
        token = authorization.substring(7);
      } else {
        // Fallback to cookie
        token = request.cookies.get('auth-token')?.value;
      }

      if (!token) {
        return null;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }

      const user = await UserModel.findById(payload.userId);
      return user;
    } catch (error) {
      return null;
    }
  }

  static async requireAuth(request: NextRequest) {
    const user = await this.getCurrentUser(request);
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  static async requireAdmin(request: NextRequest) {
    const user = await this.requireAuth(request);
    if (user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
    return user;
  }
}
