"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { Comment } from "@/lib/types"
import { Avatar, AvatarFallback } from "./avatar"

interface CommentItemProps {
  comment: Comment
  className?: string
}

export function CommentItem({ comment, className }: CommentItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-3 p-4 rounded-lg bg-gray-50/80 backdrop-blur-sm", className)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
          {comment.author.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900">{comment.author.name}</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        <motion.p
          className="text-sm text-gray-700 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {comment.content}
        </motion.p>
      </div>
    </motion.div>
  )
}
