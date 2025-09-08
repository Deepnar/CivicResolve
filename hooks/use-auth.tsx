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

  // Note: Authentication now uses httpOnly cookies only
  useEffect(() => {
    // Check for existing session on mount
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      // Token is automatically sent via httpOnly cookie
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin", // Include cookies
      })

      if (response.ok) {
        const { data } = await response.json()
        setUser(data.user)
        console.log('User authenticated:', data.user.name) // Debug log
      } else {
        // Clear user state if authentication fails
        console.log('Authentication failed, response status:', response.status) // Debug log
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setUser(null)
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
      credentials: "same-origin", // Include cookies
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error("Login failed")
    }

    const { data } = await response.json()
    const { token, user: userData } = data
    
    // Note: Token is now stored as httpOnly cookie by the server
    // We don't store it in localStorage for security reasons
    
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
      credentials: "same-origin", // Include cookies
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      throw new Error("Registration failed")
    }

    const { data } = await response.json()
    const { user: userData } = data
    
    // Note: Token is now stored as httpOnly cookie by the server
    setUser(userData)
    router.push("/")
  }

  const logout = () => {
    // Clear httpOnly cookie by calling logout endpoint
    fetch("/api/auth/logout", { 
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
      // Ignore errors, just ensure client state is cleared
    })
    
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
