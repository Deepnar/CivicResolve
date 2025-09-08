"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Wifi, WifiOff, RefreshCw, Home, MapPin, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    // Check initial status
    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      // Still offline
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }

  if (isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Back Online!</h1>
          <p className="text-gray-600 mb-6">Your connection has been restored.</p>
          <Button onClick={() => window.location.reload()}>
            Continue to CivicResolve
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <WifiOff className="h-10 w-10 text-gray-600" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">You're Offline</h1>
          <p className="text-gray-600 mb-6">
            CivicResolve is not available right now. Check your internet connection and try again.
          </p>

          <Button 
            onClick={handleRetry} 
            disabled={isRetrying}
            className="w-full mb-6 touch-target"
          >
            {isRetrying ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking Connection...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </div>
            )}
          </Button>
        </motion.div>

        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Available Offline Features</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>View previously loaded issues</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Browse cached map areas</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Draft issue reports (saved locally)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <Button variant="outline" className="touch-target" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="touch-target" asChild>
              <Link href="/map" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map
              </Link>
            </Button>
            <Button variant="outline" className="touch-target" asChild>
              <Link href="/issues" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Issues
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            CivicResolve works best with an internet connection. Some features may be limited offline.
          </p>
        </div>
      </div>
    </div>
  )
}
