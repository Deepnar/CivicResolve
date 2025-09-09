"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { convertToIST } from "@/lib/date-utils"
import { StatusBadge } from "./badge-status"
import { CategoryBadge } from "./badge-category"
import { PriorityIndicator } from "./priority-indicator"
import type { Issue } from "@/lib/types"
import { MessageCircle, ThumbsUp, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader } from "./card"
import { Avatar, AvatarFallback } from "./avatar"

interface IssueCardProps {
  issue: Issue
  onClick?: () => void
  className?: string
  showReporter?: boolean
  disableAnimations?: boolean
}

export function IssueCard({ issue, onClick, className, showReporter = true, disableAnimations = false }: IssueCardProps) {
  // Handle both database count fields and array lengths
  const voteCount = (issue as any).votes_count || issue.votes?.length || 0
  const commentCount = (issue as any).comments_count || issue.comments?.length || 0

  return (
    <motion.div
      {...(!disableAnimations && {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        whileHover: { y: -2, scale: 1.01 },
        transition: { duration: 0.2 }
      })}
      className={cn("cursor-pointer w-full", className)}
      onClick={onClick}
    >
      <Card className="h-full border-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <motion.h3
                className="font-heading font-semibold text-gray-900 line-clamp-2 text-base sm:text-lg leading-tight"
                {...(!disableAnimations && {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { delay: 0.1 }
                })}
              >
                {issue.title}
              </motion.h3>
              <motion.p
                className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2"
                {...(!disableAnimations && {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { delay: 0.2 }
                })}
              >
                {issue.description}
              </motion.p>
            </div>
            <div className="flex-shrink-0">
              <PriorityIndicator priority={issue.priority} variant="icon" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
            <CategoryBadge category={issue.category} />
            <StatusBadge status={issue.status} />
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
                  <span className="text-xs font-medium truncate">{issue.reporter.name}</span>
                </motion.div>
              )}
              <span className="text-xs whitespace-nowrap">{formatDistanceToNow(convertToIST(issue.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
