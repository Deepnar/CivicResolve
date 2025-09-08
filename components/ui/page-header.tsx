"use client"

import type React from "react"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon: Icon, children, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("pb-4 sm:pb-6 border-b border-gray-200/50", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {Icon && (
            <motion.div
              className="rounded-lg bg-blue-100 p-2 sm:p-3 flex-shrink-0"
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </motion.div>
          )}
          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-gray-900 leading-tight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 leading-relaxed"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>
        {children && (
          <motion.div
            className="w-full sm:w-auto flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
