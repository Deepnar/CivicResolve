"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Calendar, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export function NotificationBell() {
  const { unreadCount, notifications, markAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'LOW':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const handleDropdownOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && unreadCount > 0) {
      // Mark as read when user opens the dropdown
      setTimeout(markAsRead, 1000)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant="destructive" 
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} asChild className="p-0">
                  <Link 
                    href={`/issues/${notification.id}`}
                    className="block p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getPriorityIcon(notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.notification_type === 'new' ? 'New Issue' : 'Issue Assigned'}
                          </p>
                          <Badge 
                            variant={notification.notification_type === 'new' ? 'default' : 'secondary'}
                            className="text-xs ml-2"
                          >
                            {notification.category}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-1 line-clamp-2">
                          {notification.title}
                        </p>
                        
                        <div className="flex items-center text-xs text-gray-500 space-x-3">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-24">
                              {notification.address.split(',')[0]}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true 
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {notification.reporter_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            by {notification.reporter_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/organization/issues">
                <Button variant="ghost" className="w-full text-sm">
                  View All Issues
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}