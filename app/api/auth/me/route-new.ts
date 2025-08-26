import { type NextRequest, NextResponse } from "next/server"
import { AuthUtils } from "@/lib/db"

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
