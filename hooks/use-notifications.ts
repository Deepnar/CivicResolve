import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'

interface Notification {
  id: number
  title: string
  category: string
  priority: string
  address: string
  created_at: string
  reporter_name: string
  notification_type: 'new' | 'assigned'
}

interface NotificationData {
  unreadCount: number
  notifications: Notification[]
}

export function useNotifications() {
  const [notificationData, setNotificationData] = useState<NotificationData>({
    unreadCount: 0,
    notifications: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    // Only fetch for organization members and admins
    const isOrgUser = user.role === 'ORGANIZATION_ADMIN' || 
                     user.role === 'ADMIN'

    if (!isOrgUser && user.role === 'CITIZEN') {
      // Check if citizen is organization member
      try {
        const orgResponse = await fetch('/api/user/organization-status', {
          credentials: 'include'
        })
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          if (!orgData.isOrganizationMember) {
            return
          }
        } else {
          return
        }
      } catch (error) {
        console.error('Error checking organization status:', error)
        return
      }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNotificationData(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch notifications on mount and user change
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications, user])

  const markAsRead = useCallback(() => {
    setNotificationData(prev => ({
      ...prev,
      unreadCount: 0
    }))
  }, [])

  return {
    unreadCount: notificationData.unreadCount,
    notifications: notificationData.notifications,
    isLoading,
    refreshNotifications: fetchNotifications,
    markAsRead
  }
}