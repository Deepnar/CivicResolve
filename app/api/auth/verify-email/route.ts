import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { PerformanceMonitor } from "@/lib/performance"

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
})

export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/auth/verify-email')
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      endTimer()
      return ApiResponseHandler.badRequest("Verification token is required")
    }

    const { token: validatedToken } = verifyEmailSchema.parse({ token })

    // Find user by verification token
    const user = await UserModel.findByVerificationToken(validatedToken)
    if (!user) {
      endTimer()
      return ApiResponseHandler.badRequest("Invalid or expired verification token")
    }

    // Verify the email
    const verificationSuccess = await UserModel.verifyEmail(validatedToken)
    if (!verificationSuccess) {
      endTimer()
      return ApiResponseHandler.internal("Failed to verify email")
    }

    endTimer()
    return ApiResponseHandler.success(
      { message: "Email verified successfully" },
      "Email verification successful"
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      endTimer()
      return ApiResponseHandler.validation("Invalid verification token", error.errors)
    }

    endTimer()
    return ApiResponseHandler.internal("Email verification failed", error as Error)
  }
}

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/verify-email')
  
  try {
    const body = await request.json()
    const { token } = verifyEmailSchema.parse(body)

    // Find user by verification token
    const user = await UserModel.findByVerificationToken(token)
    if (!user) {
      endTimer()
      return ApiResponseHandler.badRequest("Invalid or expired verification token")
    }

    // Verify the email
    const verificationSuccess = await UserModel.verifyEmail(token)
    if (!verificationSuccess) {
      endTimer()
      return ApiResponseHandler.internal("Failed to verify email")
    }

    endTimer()
    return ApiResponseHandler.success(
      { message: "Email verified successfully" },
      "Email verification successful"
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      endTimer()
      return ApiResponseHandler.validation("Invalid verification token", error.errors)
    }

    endTimer()
    return ApiResponseHandler.internal("Email verification failed", error as Error)
  }
}
