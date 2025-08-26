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
}

export function IssueCard({ issue, onClick, className, showReporter = true }: IssueCardProps) {
  // Handle both database count fields and array lengths
  const voteCount = (issue as any).votes_count || issue.votes?.length || 0
  const commentCount = (issue as any).comments_count || issue.comments?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
    >
      <Card className="h-full border-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <motion.h3
                className="font-heading font-semibold text-gray-900 line-clamp-2 text-lg leading-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {issue.title}
              </motion.h3>
              <motion.p
                className="mt-2 text-sm text-gray-600 line-clamp-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {issue.description}
              </motion.p>
            </div>
            <PriorityIndicator priority={issue.priority} variant="icon" />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <CategoryBadge category={issue.category} />
            <StatusBadge status={issue.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <motion.div
                className="flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="font-medium">{voteCount}</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">{commentCount}</span>
              </motion.div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-32">{issue.address}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showReporter && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {issue.reporter.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{issue.reporter.name}</span>
                </motion.div>
              )}
              <span className="text-xs">{formatDistanceToNow(convertToIST(issue.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
