"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ISSUE_STATUS } from "@/lib/constants"
import type { IssueStatus } from "@/lib/types"

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = ISSUE_STATUS[status]

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        "border border-current/20",
        className,
      )}
      style={{
        color: statusConfig.color,
        backgroundColor: statusConfig.bgColor,
      }}
    >
      <motion.div
        className="mr-1.5 h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: statusConfig.color }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      {statusConfig.label}
    </motion.div>
  )
}
