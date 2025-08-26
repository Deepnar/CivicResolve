"use client"

import type React from "react"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ISSUE_CATEGORIES } from "@/lib/constants"
import type { IssueCategory } from "@/lib/types"
import * as Icons from "lucide-react"

interface CategoryBadgeProps {
  category: IssueCategory
  className?: string
  showIcon?: boolean
}

export function CategoryBadge({ category, className, showIcon = true }: CategoryBadgeProps) {
  const categoryConfig = ISSUE_CATEGORIES[category]
  const IconComponent = Icons[categoryConfig.icon as keyof typeof Icons] as React.ComponentType<any>

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium",
        "bg-white/80 backdrop-blur-sm border border-gray-200/50",
        "hover:bg-white/90 transition-colors duration-200",
        className,
      )}
      style={{ color: categoryConfig.color }}
    >
      {showIcon && IconComponent && (
        <motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ duration: 0.3 }}>
          <IconComponent className="mr-1.5 h-3.5 w-3.5" />
        </motion.div>
      )}
      {categoryConfig.label}
    </motion.div>
  )
}
