"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FilterTab {
  id: string
  label: string
  count?: number
}

interface FilterTabsProps {
  tabs: FilterTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function FilterTabs({ tabs, activeTab, onTabChange, className }: FilterTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 sm:gap-3", className)}>
      {tabs.map((tab, index) => (
        <motion.button
          key={tab.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
            "border border-gray-200 bg-white/80 backdrop-blur-sm touch-target-small",
            "hover:bg-white hover:shadow-sm min-h-touch",
            activeTab === tab.id && "bg-blue-600 text-white border-blue-600 shadow-sm",
          )}
        >
          <span className="whitespace-nowrap">{tab.label}</span>
          {tab.count !== undefined && (
            <motion.span
              className={cn(
                "ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600",
              )}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {tab.count}
            </motion.span>
          )}

          {activeTab === tab.id && (
            <motion.div
              className="absolute inset-0 rounded-lg bg-blue-600 -z-10"
              layoutId="activeTab"
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  )
}
