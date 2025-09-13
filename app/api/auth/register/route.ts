import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel, AuthUtils } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { CommonSchemas } from "@/lib/input-sanitizer"
import { PerformanceMonitor } from "@/lib/performance"
import { emailService } from "@/lib/email-service"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  email: CommonSchemas.email,
  password: CommonSchemas.password,
})

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/register')
  
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email)
    if (existingUser) {
      endTimer()
      return ApiResponseHandler.conflict("User with this email already exists")
    }

    // Generate verification token
    const verificationToken = emailService.generateVerificationToken()
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user with verification token
    const userId = await UserModel.create({
      name,
      email,
      password,
      role: "CITIZEN",
      verification_token: verificationToken,
      verification_token_expires: tokenExpires,
    })

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, name)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Continue with registration even if email fails
    }

    // Get the created user (without password)
    const user = await UserModel.findById(userId)
    if (!user) {
      return ApiResponseHandler.internal("Failed to create user")
    }

    // Create successful response (no token until verified)
    const responseData = {
      user,
      message: "User registered successfully. Please check your email to verify your account before logging in.",
      requiresVerification: true,
      clearAuthState: true
    };

    const response = ApiResponseHandler.success(responseData, "Registration successful - Please verify your email")

    // Clear any existing authentication cookies to ensure clean state
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
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      endTimer()
      return ApiResponseHandler.validation("Invalid registration data", error.errors)
    }

    endTimer()
    return ApiResponseHandler.internal("Registration failed", error as Error)
  }
}
