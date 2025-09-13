import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWTForEdge } from "@/lib/auth-utils"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Production security headers
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'")
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    // Get origin from request
    const origin = request.headers.get('origin')
    
    // Get allowed origins from environment variables
    const productionOrigin = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || 'https://dev.raunakcodes.me'
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      productionOrigin,
      // Add additional origins if needed
    ]

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    } else {
      // In production, check against whitelist
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      const payload = await verifyJWTForEdge(token)
      if (!payload || payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
