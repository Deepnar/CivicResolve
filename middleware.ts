import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWTForEdge } from "@/lib/auth-utils"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value

    console.log("🔐 Middleware Debug - Path:", pathname)
    console.log("🔐 Token found:", !!token)
    
    if (!token) {
      console.log("🔐 No token - redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    console.log("🔐 Full token:", token)
    console.log("🔐 Token length:", token.length)

    try {
      const payload = verifyJWTForEdge(token)
      console.log("🔐 Payload:", payload)
      
      if (!payload) {
        console.log("🔐 No payload - redirecting to home")
        return NextResponse.redirect(new URL("/", request.url))
      }
      
      if (payload.role !== "ADMIN") {
        console.log("🔐 Not admin role:", payload.role, "- redirecting to home")
        return NextResponse.redirect(new URL("/", request.url))
      }
      
      console.log("🔐 Admin access granted!")
    } catch (error) {
      console.log("🔐 Token verification error:", error)
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
