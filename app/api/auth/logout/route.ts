import type { NextRequest } from "next/server"
import { ApiResponseHandler } from "@/lib/api-response"
import { PerformanceMonitor } from "@/lib/performance"

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/logout')
  
  try {
    const response = ApiResponseHandler.success(
      { message: "Logged out successfully" },
      "Logout successful"
    );

    // Clear all authentication cookies
    const cookiesToClear = ['auth-token', 'session', 'token', 'jwt', 'authentication', 'authToken']
    
    cookiesToClear.forEach(cookieName => {
      // Clear for root path
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/',
        maxAge: 0
      })
      
      // Clear for api path
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/api',
        maxAge: 0
      })
      
      // Clear without httpOnly in case there are client-side cookies
      response.cookies.set(cookieName, '', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/',
        maxAge: 0
      })
    })

    endTimer()
    return response;
  } catch (error) {
    endTimer()
    return ApiResponseHandler.internal("Logout failed", error as Error);
  }
}
