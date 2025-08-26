"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Helper function to get token from localStorage or cookie
  const getToken = (): string | null => {
    // First check localStorage
    const localToken = localStorage.getItem("auth-token")
    if (localToken) return localToken
    
    // Fallback to cookie
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    if (authCookie) {
      return authCookie.split('=')[1]
    }
    
    return null
  }

  useEffect(() => {
    // Check for existing session on mount
    const token = getToken()
    if (token) {
      // Verify token and get user data
      fetchUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const { user: userData } = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem("auth-token")
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      localStorage.removeItem("auth-token")
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error("Login failed")
    }

    const { token, user: userData } = await response.json()
    localStorage.setItem("auth-token", token)
    
    // Set cookie for middleware to read
    document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
    
    setUser(userData)

    // Redirect based on user role
    if (userData.role === "ADMIN") {
      router.push("/admin")
    } else {
      router.push("/")
    }
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      throw new Error("Registration failed")
    }

    const { token, user: userData } = await response.json()
    localStorage.setItem("auth-token", token)
    setUser(userData)
    router.push("/")
  }

  const logout = () => {
    localStorage.removeItem("auth-token")
    // Clear cookie
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
