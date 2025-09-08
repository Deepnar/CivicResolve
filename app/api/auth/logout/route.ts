import type { NextRequest } from "next/server"
import { ApiResponseHandler } from "@/lib/api-response"

export async function POST(request: NextRequest) {
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

    return response;
  } catch (error) {
    return ApiResponseHandler.internal("Logout failed", error as Error);
  }
}
