"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Menu, X, MapPin, PlusCircle, User, LogOut, Settings, BarChart3, Download, Smartphone, Building2, Users2, Heart, AlertTriangle, Radar, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { usePWAInstall } from "@/hooks/use-pwa-install"
import { useToast } from "@/hooks/use-toast"
import { NotificationBell } from "@/components/ui/notification-bell"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isOrganizationMember, setIsOrganizationMember] = useState(false)
  const { user, logout, refreshUser } = useAuth()
  const { canInstall, isIOS, installApp } = usePWAInstall()
  const { toast } = useToast()

  // Check if user is an organization member
  useEffect(() => {
    const checkOrganizationMembership = async () => {
      if (user && user.role === 'CITIZEN') {
        try {
          const response = await fetch('/api/user/organization-status', {
            credentials: 'include'
          })
          if (response.ok) {
            const data = await response.json()
            setIsOrganizationMember(data.isOrganizationMember)
          }
        } catch (error) {
          console.error('Error checking organization membership:', error)
        }
      } else {
        setIsOrganizationMember(false)
      }
    }

    checkOrganizationMembership()
  }, [user])

  // Periodically refresh user data to catch role changes
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshUser()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user, refreshUser])

  const handleInstallApp = async () => {
    try {
      await installApp()
      if (!isIOS) {
        toast({
          title: "Installing App",
          description: "CivicResolve is being added to your device.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Installation Failed",
        description: "Unable to install the app. Please try again.",
      })
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Map View", href: "/map", icon: MapPin },
    { name: "Report Issue", href: "/report", icon: PlusCircle },
  ]

  const adminNavigation = [
    { name: "Admin Dashboard", href: "/admin", icon: BarChart3 },
    { name: "Manage Issues", href: "/admin/issues", icon: Settings },
    { name: "Appeals", href: "/admin/appeals", icon: AlertTriangle },
    { name: "Users", href: "/admin/users", icon: User },
    { name: "Organizations", href: "/admin/organizations", icon: Building2 },
    { name: "NGOs", href: "/admin/ngos", icon: Heart },
    { name: "AI Candidates", href: "/admin/candidates", icon: Radar },
    { name: "AI Verification", href: "/admin/verification", icon: ShieldCheck },
  ]

  const organizationAdminNavigation = [
    { name: "Organization Dashboard", href: "/organization", icon: BarChart3 },
    { name: "Appeals", href: "/admin/appeals", icon: AlertTriangle },
    { name: "Organization Issues", href: "/organization/issues", icon: Settings },
    { name: "Team Members", href: "/organization/members", icon: Users2 },
  ]

  const organizationMemberNavigation = [
    { name: "My Issues", href: "/my-issues", icon: Settings },
    { name: "Organization Dashboard", href: "/organization", icon: BarChart3 },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image
                src="/icons/logo.png"
                alt="CivicResolve Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-heading font-bold text-xl text-gray-900">CivicResolve</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <>
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}                {user.role === "ADMIN" && (
                  <>
                    <div className="w-px h-6 bg-gray-300" />
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                )}

                {user.role === "ORGANIZATION_ADMIN" && (
                  <>
                    <div className="w-px h-6 bg-gray-300" />
                    {organizationAdminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                )}

                {user.role === "CITIZEN" && isOrganizationMember && (
                  <>
                    <div className="w-px h-6 bg-gray-300" />
                    {organizationMemberNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell for Organization Members */}
                {(user.role === 'ORGANIZATION_ADMIN' || 
                  user.role === 'ADMIN' || 
                  (user.role === 'CITIZEN' && isOrganizationMember)) && (
                  <NotificationBell />
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-blue-600">{user.points} points</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {canInstall && (
                    <DropdownMenuItem onClick={handleInstallApp} className="flex items-center text-blue-600">
                      {isIOS ? (
                        <Smartphone className="mr-2 h-4 w-4" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isIOS ? "Add to Home Screen" : "Install App"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && user && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Link>
              ))}

              {user.role === "ADMIN" && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </>
              )}

              {user.role === "ORGANIZATION_ADMIN" && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  {organizationAdminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </>
              )}

              {user.role === "CITIZEN" && isOrganizationMember && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  {organizationMemberNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </>
              )}

              {canInstall && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <button
                    onClick={() => {
                      handleInstallApp()
                      setIsOpen(false)
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors w-full text-left"
                  >
                    {isIOS ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{isIOS ? "Add to Home Screen" : "Install App"}</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  )
}
