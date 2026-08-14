"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatTimeAgo } from "@/lib/date-utils"
import { StatusBadge } from "./badge-status"
import { CategoryBadge } from "./badge-category"
import { VerificationBadge } from "./verification-badge"
import { PriorityIndicator } from "./priority-indicator"
import type { Issue } from "@/lib/types"
import { MessageCircle, ThumbsUp, MapPin, Camera } from "lucide-react"
import { Card, CardContent, CardHeader } from "./card"
import { Avatar, AvatarFallback } from "./avatar"

interface IssueCardProps {
  issue: Issue
  onClick?: () => void
  className?: string
  showReporter?: boolean
}

export function IssueCard({ issue, onClick, className, showReporter = true }: IssueCardProps) {
  // Handle both database count fields and array lengths
  const voteCount = (issue as any).votes_count || issue.votes?.length || 0
  const commentCount = (issue as any).comments_count || issue.comments?.length || 0

  // Calculate engagement score for prioritization
  const calculateEngagementScore = () => {
    // Weight votes and comments (comments are weighted higher as they require more engagement)
    return (voteCount * 1) + (commentCount * 2)
  }

  // Get priority color based on engagement score (simplified for individual cards)
  const getPriorityColor = (engagementScore: number, issueStatus: string) => {
    // If issue is resolved, always show green regardless of engagement
    if (issueStatus?.toUpperCase() === 'RESOLVED') {
      return '#10b981' // Green for resolved issues
    }
    
    if (engagementScore === 0) return '#ffffff' // White for no engagement
    if (engagementScore <= 2) return '#fbbf24' // Yellow for low engagement
    if (engagementScore <= 5) return '#f97316' // Orange for medium engagement
    return '#dc2626' // Red for high engagement
  }

  const engagementScore = calculateEngagementScore()
  const priorityColor = getPriorityColor(engagementScore, issue.status)
  const isHighPriority = engagementScore > 5 && issue.status?.toUpperCase() !== 'RESOLVED'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn("cursor-pointer w-full", className)}
      onClick={onClick}
    >
      <Card className="h-full border-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 relative"
            style={{
              borderLeft: `4px solid ${priorityColor === '#ffffff' ? '#e5e7eb' : priorityColor}`,
              backgroundColor: priorityColor === '#ffffff' ? undefined : `${priorityColor}15`
            }}
      >
        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <motion.h3
                className="font-heading font-semibold text-gray-900 line-clamp-2 text-base sm:text-lg leading-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {issue.title}
              </motion.h3>
              <motion.p
                className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {issue.description}
              </motion.p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {engagementScore > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700">
                  <span className="text-xs font-bold">🔥 {engagementScore}</span>
                  {isHighPriority && (
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              )}
              <PriorityIndicator priority={issue.priority} variant="icon" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
            <CategoryBadge category={issue.category} />
            <StatusBadge status={issue.status} />
            <VerificationBadge
              verificationVerdict={(issue as any).verificationVerdict}
              discoveryClass={(issue as any).discoveryClass}
            />
            {issue.status === 'RESOLVED' && issue.resolutionImageUrl && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
                <Camera className="h-3 w-3" />
                <span className="text-xs font-medium">Verified</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-3 sm:gap-4">
              <motion.div
                className="flex items-center gap-1 touch-target-small"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="font-medium">{voteCount}</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-1 touch-target-small"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="font-medium">{commentCount}</span>
              </motion.div>
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate text-xs sm:text-sm max-w-20 sm:max-w-32">{issue.address}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {showReporter && (
                <motion.div
                  className="flex items-center gap-2 min-w-0"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {issue.reporter.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate">
                    {issue.reporter.name}
                    {issue.isAnonymous && (
                      <span className="ml-1 text-gray-400">🕶️</span>
                    )}
                  </span>
                </motion.div>
              )}
              <span className="text-xs whitespace-nowrap">{formatTimeAgo(issue.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
