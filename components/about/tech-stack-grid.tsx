"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TechItem {
  name: string
  description: string
  category: string
  icon: string
  color: string
  bgColor: string
  version?: string
  isNew?: boolean
}

const techStack: TechItem[] = [
  // Frontend
  {
    name: "Next.js 15",
    description: "React framework with App Router architecture",
    category: "Frontend",
    icon: "⚛️",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    version: "15.2.4"
  },
  {
    name: "TypeScript",
    description: "Type-safe development with strict mode",
    category: "Frontend",
    icon: "🔷",
    color: "text-blue-700",
    bgColor: "bg-blue-100"
  },
  {
    name: "Tailwind CSS",
    description: "Utility-first styling framework",
    category: "Frontend",
    icon: "🎨",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100"
  },
  {
    name: "Framer Motion",
    description: "Animation and motion graphics",
    category: "Frontend",
    icon: "🌟",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    name: "Radix UI",
    description: "Accessible, unstyled UI components",
    category: "Frontend",
    icon: "🧩",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    name: "React Leaflet",
    description: "Interactive map components",
    category: "Frontend",
    icon: "🗺️",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },

  // Backend & Database
  {
    name: "MySQL 8.0",
    description: "Relational database with connection pooling",
    category: "Backend",
    icon: "🐬",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    name: "JWT",
    description: "JSON Web Token authentication",
    category: "Backend",
    icon: "🔐",
    color: "text-red-600",
    bgColor: "bg-red-100"
  },
  {
    name: "bcryptjs",
    description: "Password hashing and security",
    category: "Backend",
    icon: "🛡️",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  {
    name: "Zod",
    description: "Schema validation and type safety",
    category: "Backend",
    icon: "✅",
    color: "text-violet-600",
    bgColor: "bg-violet-100"
  },

  // AI & Performance
  {
    name: "Google Gemini AI",
    description: "Advanced language model integration",
    category: "AI",
    icon: "🤖",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    isNew: true
  },
  {
    name: "Performance Monitor",
    description: "Real-time metrics and optimization",
    category: "Performance",
    icon: "📊",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    isNew: true
  },
  {
    name: "Memory Caching",
    description: "In-memory caching with TTL support",
    category: "Performance",
    icon: "⚡",
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
  {
    name: "Error Boundaries",
    description: "Production-ready error handling",
    category: "Performance",
    icon: "🚨",
    color: "text-red-600",
    bgColor: "bg-red-100"
  },

  // DevOps & Tools
  {
    name: "ESLint",
    description: "Code linting and quality enforcement",
    category: "DevOps",
    icon: "🔍",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    name: "PostCSS",
    description: "CSS processing and optimization",
    category: "DevOps",
    icon: "🎯",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  }
]

const categories = ["Frontend", "Backend", "AI", "Performance", "DevOps"]

export function TechStackGrid() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-white to-gray-50">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            Technology Stack
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Built with Modern Technologies
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            CivicResolve leverages cutting-edge technologies to deliver a robust, 
            scalable, and secure platform for civic engagement.
          </p>
        </motion.div>

        {categories.map((category, categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-3 flex items-center justify-center text-white font-bold text-sm">
                {category.charAt(0)}
              </span>
              {category}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {techStack
                .filter(tech => tech.category === category)
                .map((tech, index) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                    whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -10,
                      rotateY: 5,
                      transition: { duration: 0.3 }
                    }}
                    className="perspective-1000"
                  >
                    <Card className="h-full bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                      {tech.isNew && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge variant="destructive" className="text-xs">
                            NEW
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-3">
                          <motion.div
                            className={`${tech.bgColor} p-3 rounded-lg text-2xl group-hover:scale-110 transition-transform duration-300`}
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            {tech.icon}
                          </motion.div>
                          <div className="flex-1">
                            <CardTitle className="text-lg group-hover:text-blue-600 transition-colors flex items-center gap-2">
                              {tech.name}
                              {tech.version && (
                                <Badge variant="outline" className="text-xs">
                                  v{tech.version}
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                        </div>
                        <CardDescription className="text-gray-600 leading-relaxed">
                          {tech.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {/* Tech highlight bar */}
                        <motion.div
                          className="h-1 bg-gray-200 rounded-full overflow-hidden"
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          transition={{ delay: categoryIndex * 0.1 + index * 0.05, duration: 0.8 }}
                        >
                          <motion.div
                            className={`h-full ${tech.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-400 to-')}${tech.color.split('-')[1]}-600 rounded-full`}
                            initial={{ width: "0%" }}
                            whileInView={{ width: "100%" }}
                            transition={{ delay: categoryIndex * 0.1 + index * 0.05 + 0.3, duration: 1, ease: "easeOut" }}
                          />
                        </motion.div>

                        {/* Hover effect background */}
                        <motion.div
                          className={`absolute inset-0 ${tech.bgColor} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                          initial={false}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        ))}

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: "🚀",
              title: "Production Ready",
              description: "Enterprise-grade security, performance monitoring, and error handling",
              color: "bg-blue-100 text-blue-700"
            },
            {
              icon: "⚡",
              title: "High Performance",
              description: "Optimized builds, caching strategies, and real-time monitoring",
              color: "bg-yellow-100 text-yellow-700"
            },
            {
              icon: "🔒",
              title: "Secure by Design",
              description: "Comprehensive security headers, input validation, and authentication",
              color: "bg-red-100 text-red-700"
            }
          ].map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="text-4xl mb-4">{highlight.icon}</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {highlight.title}
              </h4>
              <p className="text-gray-600">
                {highlight.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}