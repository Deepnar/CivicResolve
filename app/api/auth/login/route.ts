import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel, AuthUtils } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { InputSanitizer, CommonSchemas } from "@/lib/input-sanitizer"
import { withRateLimit } from "@/lib/rate-limiter"
import { PerformanceMonitor } from "@/lib/performance"

const loginSchema = z.object({
  email: CommonSchemas.email,
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
})

async function loginHandler(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/auth/login')
  
  try {
    const body = await request.json()
    
    // Sanitize input
    const sanitizedBody = InputSanitizer.sanitizeObject(body, {
      emailFields: ['email'],
      textFields: ['password']
    })

    const { email, password } = loginSchema.parse(sanitizedBody)

    // Find user by email
    const user = await UserModel.findByEmail(email)
    if (!user) {
      endTimer()
      return ApiResponseHandler.unauthorized("Invalid email or password")
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.password!)
    if (!isValidPassword) {
      endTimer()
      return ApiResponseHandler.unauthorized("Invalid email or password")
    }

    // Check if email is verified
    if (!user.is_verified) {
      endTimer()
      return ApiResponseHandler.unauthorized("Please verify your email before logging in. Check your inbox for the verification link.")
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    // Create successful response
    const responseData = {
      user: userWithoutPassword,
      token,
      message: "Login successful"
    };

    const response = ApiResponseHandler.success(responseData, "Login successful")

    // Set httpOnly cookie for security (not accessible via JavaScript)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    endTimer()
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      endTimer()
      return ApiResponseHandler.validation("Invalid input data", error.errors)
    }

    endTimer()
    return ApiResponseHandler.internal("Login failed", error as Error)
  }
}

// Export as POST without rate limiting for now (Next.js Request type compatibility issue)
export async function POST(request: NextRequest) {
  return loginHandler(request)
}
