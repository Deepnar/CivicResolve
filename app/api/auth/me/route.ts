import { type NextRequest, NextResponse } from "next/server"
import { AuthUtils, UserModel } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { PerformanceMonitor } from "@/lib/performance"

export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/auth/me')
  
  try {
    const user = await AuthUtils.getCurrentUser(request)
    if (!user) {
      endTimer()
      return ApiResponseHandler.unauthorized("Authentication required")
    }

    endTimer()
    return ApiResponseHandler.success({ user }, "User authenticated successfully")
  } catch (error) {
    endTimer()
    return ApiResponseHandler.internal("Authentication verification failed", error as Error)
  }
}

export async function PATCH(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('PATCH /api/auth/me')
  
  try {
    const user = await AuthUtils.getCurrentUser(request)
    if (!user) {
      endTimer()
      return ApiResponseHandler.unauthorized("Authentication required")
    }

    const body = await request.json()
    const { name, email } = body

    // Validate input
    if (!name || !email) {
      endTimer()
      return ApiResponseHandler.validation("Name and email are required", [])
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await UserModel.findByEmail(email)
      if (existingUser && existingUser.id !== user.id) {
        endTimer()
        return ApiResponseHandler.conflict("Email is already taken")
      }
    }

    // Update user
    await UserModel.updateProfile(user.id, { name, email })

    // Return updated user data
    const updatedUser = await UserModel.findById(user.id)
    endTimer()
    return ApiResponseHandler.success({ user: updatedUser }, "Profile updated successfully")
  } catch (error) {
    endTimer()
    return ApiResponseHandler.internal("Failed to update profile", error as Error)
  }
}
