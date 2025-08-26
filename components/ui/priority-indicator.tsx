"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { PRIORITY_LEVELS } from "@/lib/constants"
import type { Priority } from "@/lib/types"
import { AlertTriangle, Minus, TrendingUp, Zap } from "lucide-react"

interface PriorityIndicatorProps {
  priority: Priority
  className?: string
  variant?: "badge" | "icon" | "full"
}

const priorityIcons = {
  LOW: Minus,
  MEDIUM: TrendingUp,
  HIGH: AlertTriangle,
  URGENT: Zap,
}

export function PriorityIndicator({ priority, className, variant = "badge" }: PriorityIndicatorProps) {
  const priorityConfig = PRIORITY_LEVELS[priority]
  const IconComponent = priorityIcons[priority]

  if (variant === "icon") {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
        className={cn("inline-flex", className)}
        style={{ color: priorityConfig.color }}
      >
        <IconComponent className="h-4 w-4" />
      </motion.div>
    )
  }

  if (variant === "full") {
    return (
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn("inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium", className)}
        style={{ color: priorityConfig.color }}
      >
        <IconComponent className="h-4 w-4" />
        {priorityConfig.label} Priority
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", "border-2", className)}
      style={{
        color: priorityConfig.color,
        borderColor: priorityConfig.color,
        backgroundColor: `${priorityConfig.color}10`,
      }}
    >
      <IconComponent className="mr-1 h-3 w-3" />
      {priorityConfig.label}
    </motion.div>
  )
}
