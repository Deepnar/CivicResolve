import type { NextRequest } from "next/server"
import { ApiResponseHandler } from "@/lib/api-response"
import { PerformanceMonitor } from "@/lib/performance"

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/logout')
  
  try {
    // Clear the httpOnly cookie
    const response = ApiResponseHandler.success(
      { message: "Logged out successfully" },
      "Logout successful"
    );

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(0) // Expire immediately
    });

    endTimer()
    return response;
  } catch (error) {
    endTimer()
    return ApiResponseHandler.internal("Logout failed", error as Error);
  }
}
