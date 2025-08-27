import { type NextRequest, NextResponse } from "next/server"
import { AuthUtils, UserModel } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await AuthUtils.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth verification error:", error)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await AuthUtils.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Validate input
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await UserModel.findByEmail(email)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 409 })
      }
    }

    // Update user
    await UserModel.updateProfile(user.id, { name, email })

    // Return updated user data
    const updatedUser = await UserModel.findById(user.id)
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
