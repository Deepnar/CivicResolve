"use client"

import { useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, MapPin, MessageSquare, Building2, 
  CheckCircle, Clock, TrendingUp, Shield 
} from "lucide-react"

interface StatItem {
  icon: React.ElementType
  value: number
  suffix?: string
  label: string
  description: string
  color: string
  bgColor: string
}

const stats: StatItem[] = [
  {
    icon: Users,
    value: 15000,
    suffix: "+",
    label: "Active Citizens",
    description: "Community members actively using the platform",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: MapPin,
    value: 3500,
    suffix: "+",
    label: "Issues Resolved",
    description: "Civic problems successfully addressed",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Building2,
    value: 25,
    label: "Organizations",
    description: "Municipal departments and civic organizations",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: MessageSquare,
    value: 12000,
    suffix: "+",
    label: "Community Interactions",
    description: "Comments, votes, and citizen engagement activities",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Clock,
    value: 72,
    suffix: "h",
    label: "Avg Resolution Time",
    description: "Average time to resolve reported issues",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100"
  },
  {
    icon: TrendingUp,
    value: 95,
    suffix: "%",
    label: "Success Rate",
    description: "Percentage of issues successfully resolved",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  {
    icon: CheckCircle,
    value: 99.9,
    suffix: "%",
    label: "Uptime",
    description: "Platform availability and reliability",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    icon: Shield,
    value: 100,
    suffix: "%",
    label: "Security Score",
    description: "Enterprise-grade security implementation",
    color: "text-red-600",
    bgColor: "bg-red-100"
  }
]

function AnimatedCounter({ value, suffix = "", duration = 2000 }: { value: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const startCount = 0
    const endCount = value

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const currentCount = startCount + (endCount - startCount) * easeOutQuart(progress)
      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(updateCount)
      }
    }

    requestAnimationFrame(updateCount)
  }, [isInView, value, duration])

  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

  const formatValue = (val: number) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return Math.round(val).toString()
  }

  return (
    <span ref={ref} className="font-bold text-4xl">
      {value >= 1000 ? formatValue(count) : Math.round(count)}
      {suffix}
    </span>
  )
}

export function StatsCounter() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            delay: index * 0.1,
            type: "spring",
            stiffness: 100
          }}
          whileHover={{ 
            scale: 1.05, 
            y: -5,
            transition: { duration: 0.2 }
          }}
          viewport={{ once: true }}
        >
          <Card className="h-full bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <motion.div
                  className="text-right"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                >
                  <div className={`${stat.color} text-4xl font-bold leading-none`}>
                    <AnimatedCounter 
                      value={stat.value} 
                      suffix={stat.suffix} 
                      duration={2000 + index * 200}
                    />
                  </div>
                </motion.div>
              </div>
              
              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                {stat.label}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {stat.description}
              </p>
              
              {/* Progress Bar Animation */}
              <motion.div
                className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.8, duration: 1 }}
              >
                <motion.div
                  className={`h-full ${stat.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-400 to-')}${stat.color.split('-')[1]}-600 rounded-full`}
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  transition={{ delay: index * 0.1 + 1, duration: 1.5, ease: "easeOut" }}
                />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}