"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  className?: string
  color?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  color = "#3b82f6",
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wider truncate">
            {title}
          </CardTitle>
          <motion.div
            className="rounded-lg p-1.5 sm:p-2 flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color }} />
          </motion.div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <motion.div
            className="text-xl sm:text-2xl md:text-3xl font-bold font-heading text-gray-900 leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {value}
          </motion.div>
          {description && (
            <motion.p
              className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {description}
            </motion.p>
          )}
          {trend && (
            <motion.div
              className={cn(
                "flex items-center text-xs sm:text-sm mt-2 sm:mt-3 gap-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="font-medium">
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500">{trend.label}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
