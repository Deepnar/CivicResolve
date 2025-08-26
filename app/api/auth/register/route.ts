import type { NextRequest } from "next/server"
import { z } from "zod"
import { UserModel, AuthUtils } from "@/lib/db"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email)
    if (existingUser) {
      return Response.json({ error: "User with this email already exists" }, { status: 400 })
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
      return Response.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return Response.json({
      user,
      token,
      message: "User registered successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Registration error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
