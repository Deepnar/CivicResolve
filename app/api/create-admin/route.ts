import type { NextRequest } from "next/server"
import { UserModel } from "@/lib/models"

export async function POST(request: NextRequest) {
  try {
    // This is a temporary endpoint for creating an admin user
    // Remove this in production!
    
    const body = await request.json()
    const { email, name, password } = body

    if (!email || !name || !password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email)
    if (existingUser) {
      return Response.json({ error: "User already exists" }, { status: 400 })
    }

    // Create admin user
    const userId = await UserModel.create({
      email,
      name,
      password,
      role: 'ADMIN'
    })

    return Response.json({ 
      message: "Admin user created successfully",
      userId,
      email,
      name
    })
  } catch (error) {
    console.error("Error creating admin user:", error)
    return Response.json({ error: "Failed to create admin user" }, { status: 500 })
  }
}
