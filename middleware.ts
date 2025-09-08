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
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    // Get origin from request
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      // Add your production domains here
      // 'https://yourdomain.com'
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
