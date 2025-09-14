"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<any>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
      })

      if (response.ok) {
        const { data } = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Authentication check failed:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin", // Include cookies
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Login failed" }))
        throw new Error(errorData.message || "Login failed")
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
    } catch (error) {
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // throw new Error(errorData.message || "Registration failed")
        throw errorData // send the error directly
      }

      const { data } = await response.json()
      
      // If server signals to clear auth state, do comprehensive cleanup
      if (data.clearAuthState) {
        // Call logout endpoint to clear server-side cookies
        try {
          await fetch("/api/auth/logout", { 
            method: "POST",
            credentials: "same-origin"
          })
        } catch (error) {
          // Silent fail for logout endpoint
        }

        // Clear all possible client-side storage
        if (typeof window !== 'undefined') {
          try {
            // Clear specific auth-related items
            const authKeys = ['auth-token', 'token', 'jwt', 'user', 'authentication']
            authKeys.forEach(key => {
              localStorage.removeItem(key)
              sessionStorage.removeItem(key)
            })
            
            // Clear auth-related cookies
            document.cookie.split(";").forEach(cookie => {
              const eqPos = cookie.indexOf("=")
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
              if (name.includes('auth') || name.includes('token') || name.includes('session')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/api`
              }
            })
          } catch (error) {
            // Silent fail for client storage clearing
          }
        }
      }
      
      // Ensure user remains null after registration
      setUser(null)
      
      return data
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      // Clear client state immediately
      setUser(null)
      
      // Clear httpOnly cookie by calling logout endpoint
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "same-origin"
      })
      
      // Navigate to login page
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Even if logout API fails, clear client state and redirect
      setUser(null)
      router.push("/login")
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser: fetchUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
