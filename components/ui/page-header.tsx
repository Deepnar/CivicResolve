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
      className={cn("flex items-center justify-between pb-6 border-b border-gray-200/50", className)}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <motion.div
            className="rounded-lg bg-blue-100 p-3"
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Icon className="h-6 w-6 text-blue-600" />
          </motion.div>
        )}
        <div>
          <motion.h1
            className="text-3xl font-bold font-heading text-gray-900"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              className="mt-2 text-gray-600"
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
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  )
}
