import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { CommonSchemas } from "@/lib/input-sanitizer"
import { PerformanceMonitor } from "@/lib/performance"
import { emailService } from "@/lib/email-service"

const resendVerificationSchema = z.object({
  email: CommonSchemas.email,
})

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/resend-verification')
  
  try {
    const body = await request.json()
    const { email } = resendVerificationSchema.parse(body)

    // Find user by email
    const user = await UserModel.findByEmail(email)
    if (!user) {
      // Don't reveal if email exists for security
      endTimer()
      return ApiResponseHandler.success(
        { message: "If the email exists, a verification link has been sent" },
        "Verification email sent"
      )
    }

    // Check if already verified
    if (user.is_verified) {
      endTimer()
      return ApiResponseHandler.badRequest("Email is already verified")
    }

    // Generate new verification token
    const verificationToken = await emailService.generateVerificationToken()
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with new token
    await UserModel.updateVerificationToken(email, verificationToken, tokenExpires)

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, user.name)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      endTimer()
      return ApiResponseHandler.internal("Failed to send verification email")
    }

    endTimer()
    return ApiResponseHandler.success(
      { message: "Verification email sent successfully" },
      "Verification email sent"
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      endTimer()
      return ApiResponseHandler.validation("Invalid email", error.errors)
    }

    endTimer()
    return ApiResponseHandler.internal("Failed to resend verification email", error as Error)
  }
}
