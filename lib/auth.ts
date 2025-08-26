import type { NextRequest } from "next/server"
import { UserModel } from "./models"
import type { AuthUser } from "./types"

const JWT_SECRET = "fallback-secret-key"

export async function hashPassword(password: string): Promise<string> {
  // Simple hash for browser compatibility
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "salt")
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password)
  return hash === hashedPassword
}

export function generateToken(user: AuthUser): string {
  // Simple base64 encoding for browser compatibility
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }
  return btoa(JSON.stringify(payload))
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = JSON.parse(atob(token))

    // Check if token is expired
    if (decoded.exp < Date.now()) {
      return null
    }

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)

  if (!user) {
    return null
  }

  // Verify user still exists in database
  const dbUser = await UserModel.findById(Number.parseInt(user.id))

  return dbUser ? user : null
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    return handler(request, user)
  }
}

export function requireAdmin(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(request, user)
  }
}
