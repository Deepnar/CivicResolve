import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel, AuthUtils } from "@/lib/db"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Find user by email
    const user = await UserModel.findByEmail(email)
    if (!user) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.password!)
    if (!isValidPassword) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    // Create response with cookie
    const response = Response.json({
      user: userWithoutPassword,
      token,
      message: "Login successful",
    })

    // Set HTTP cookie for middleware to read
    response.headers.set('Set-Cookie', `auth-token=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=strict`)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Login error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
