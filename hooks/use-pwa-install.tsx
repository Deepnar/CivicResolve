"use client"

import { useState, useEffect } from "react"

interface PWAInstallHook {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  showIOSInstructions: () => void
  installApp: () => Promise<void>
  dismissPrompt: () => void
}

export function usePWAInstall(): PWAInstallHook {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // For iOS devices, always show as installable since they can manually add to home screen
    if (isIOSDevice) {
      setCanInstall(true)
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt && !isIOS) {
      throw new Error('No install prompt available')
    }

    if (isIOS) {
      // For iOS, we can't programmatically install, so we'll show instructions
      showIOSInstructions()
      return
    }

    try {
      const { outcome } = await deferredPrompt.prompt()
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setCanInstall(false)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
      throw error
    }
  }

  const showIOSInstructions = () => {
    // Create a custom event that the PWAWrapper can listen to
    window.dispatchEvent(new CustomEvent('show-ios-install-instructions'))
  }

  const dismissPrompt = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setCanInstall(false)
  }

  return {
    canInstall: canInstall && !isInstalled,
    isInstalled,
    isIOS,
    showIOSInstructions,
    installApp,
    dismissPrompt
  }
}
