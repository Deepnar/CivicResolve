import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel, AuthUtils } from "@/lib/db"
import { ApiResponseHandler } from "@/lib/api-response"
import { CommonSchemas } from "@/lib/input-sanitizer"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  email: CommonSchemas.email,
  password: CommonSchemas.password,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email)
    if (existingUser) {
      return ApiResponseHandler.conflict("User with this email already exists")
    }

    // Create user
    const userId = await UserModel.create({
      name,
      email,
      password,
      role: "CITIZEN",
    })

    // Get the created user (without password)
    const user = await UserModel.findById(userId)
    if (!user) {
      return ApiResponseHandler.internal("Failed to create user")
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Create successful response
    const responseData = {
      user,
      token,
      message: "User registered successfully"
    };

    const response = ApiResponseHandler.success(responseData, "Registration successful")

    // Set httpOnly cookie for security
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponseHandler.validation("Invalid registration data", error.errors)
    }

    return ApiResponseHandler.internal("Registration failed", error as Error)
  }
}
