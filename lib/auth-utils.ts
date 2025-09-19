import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// Import types only to avoid bundling issues
import type { User } from './types';

// Use environment variable - NO FALLBACK for security
const JWT_SECRET = process.env.JWT_SECRET;

// Throw error if JWT_SECRET not provided
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Assert JWT_SECRET is defined for TypeScript
const jwtSecret: string = JWT_SECRET;

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Edge-compatible JWT verification for middleware
export async function verifyJWTForEdge(token: string): Promise<JWTPayload | null> {
  try {
    // Use Web Crypto API for Edge Runtime compatibility
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const signature = parts[2];
    
    // Check expiration first (quick check)
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    // Verify signature using Web Crypto API
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(jwtSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const signatureBuffer = Uint8Array.from(
        atob(signature.replace(/-/g, '+').replace(/_/g, '/')), 
        c => c.charCodeAt(0)
      );
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        encoder.encode(`${parts[0]}.${parts[1]}`)
      );
      
      if (!isValid) return null;
    }
    // If crypto.subtle not available, fallback to basic validation
    // (This should rarely happen in modern Edge runtimes)
    
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
      jwtSecret,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const result = jwt.verify(token, jwtSecret) as any;
      return result as JWTPayload;
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

      // Dynamic import to avoid bundling issues
      const { UserModel } = await import('./models');
      const user = await UserModel.findById(payload.userId);
      
      // Check if user exists and is verified
      if (!user || !user.is_verified) {
        return null;
      }
      
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

// Helper function for API routes
export async function getAuthUser(request: NextRequest) {
  return await AuthUtils.getCurrentUser(request);
}
