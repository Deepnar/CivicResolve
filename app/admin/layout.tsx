"use client"

import type React from "react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Navbar } from "@/components/navigation/navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
        <Navbar />
        {children}
      </div>
    </ProtectedRoute>
  )
}
