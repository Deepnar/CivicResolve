"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, refreshUser } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasRefreshed, setHasRefreshed] = useState(false)

  useEffect(() => {
    if (!isLoading && !isRefreshing) {
      if (!user) {
        router.push("/login")
        return
      }

      if (requireAdmin && user.role !== "ADMIN") {
        // If user should be admin but isn't, try refreshing user data once
        // This handles the case where role was changed in database but JWT is stale
        if (!hasRefreshed) {
          setIsRefreshing(true)
          setHasRefreshed(true)
          refreshUser().finally(() => {
            setIsRefreshing(false)
          })
          return
        }
        // After refresh attempt, if still not admin, redirect
        router.push("/")
        return
      }
    }
  }, [user, isLoading, requireAdmin, router, refreshUser, hasRefreshed, isRefreshing])

  if (isLoading || isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && user.role !== "ADMIN") {
    return null
  }

  return <>{children}</>
}
