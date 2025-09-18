"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Globe, Layers, Server, Shield, Smartphone, Zap } from "lucide-react"

interface ArchitectureLayer {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  components: {
    name: string
    description: string
    tech: string
  }[]
  connections: string[]
}

const architectureLayers: ArchitectureLayer[] = [
  {
    id: "frontend",
    name: "Frontend Layer",
    description: "Modern React-based user interface with responsive design",
    icon: <Smartphone className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    components: [
      {
        name: "Next.js App Router",
        description: "Server-side rendering and routing",
        tech: "React 18 + TypeScript"
      },
      {
        name: "UI Components",
        description: "Accessible component library",
        tech: "Radix UI + Tailwind CSS"
      },
      {
        name: "Interactive Maps",
        description: "Real-time geospatial visualization",
        tech: "React Leaflet + OpenStreetMap"
      },
      {
        name: "Real-time Updates",
        description: "Live data synchronization",
        tech: "WebSocket + Polling"
      }
    ],
    connections: ["api", "cdn"]
  },
  {
    id: "api",
    name: "API Gateway",
    description: "RESTful API with authentication and rate limiting",
    icon: <Server className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    components: [
      {
        name: "Authentication",
        description: "JWT-based secure authentication",
        tech: "bcryptjs + JWT"
      },
      {
        name: "Route Handlers",
        description: "API endpoints for all operations",
        tech: "Next.js API Routes"
      },
      {
        name: "Middleware",
        description: "Request processing and validation",
        tech: "Zod + Custom Middleware"
      },
      {
        name: "Rate Limiting",
        description: "API usage control and protection",
        tech: "Memory-based Throttling"
      }
    ],
    connections: ["database", "ai", "security"]
  },
  {
    id: "ai",
    name: "AI Processing",
    description: "Advanced AI for content analysis and chat assistance",
    icon: <Zap className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    components: [
      {
        name: "Gemini Integration",
        description: "Google's advanced language model",
        tech: "Google Generative AI"
      },
      {
        name: "Content Analysis",
        description: "Automatic categorization and sentiment",
        tech: "Natural Language Processing"
      },
      {
        name: "Chat Assistant",
        description: "Context-aware conversational AI",
        tech: "Retrieval-Augmented Generation"
      },
      {
        name: "Smart Routing",
        description: "Intelligent task assignment",
        tech: "Catagory Based Routing"
      }
    ],
    connections: ["api", "database"]
  },
  {
    id: "database",
    name: "Data Layer",
    description: "Relational database with optimized queries and caching",
    icon: <Database className="w-6 h-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    components: [
      {
        name: "MySQL Database",
        description: "Primary relational data storage",
        tech: "MySQL 8.0 + Connection Pooling"
      },
      {
        name: "Query Optimization",
        description: "Indexed queries and performance tuning",
        tech: "Prepared Statements + Indexes"
      },
      {
        name: "Data Models",
        description: "TypeScript-first data modeling",
        tech: "Custom ORM + Type Safety"
      },
      {
        name: "Backup & Recovery",
        description: "Automated data protection",
        tech: "Incremental Backups"
      }
    ],
    connections: ["cache", "monitoring"]
  },
  {
    id: "security",
    name: "Security Layer",
    description: "Comprehensive security with encryption and monitoring",
    icon: <Shield className="w-6 h-6" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
    components: [
      {
        name: "Authentication",
        description: "Multi-layer user verification",
        tech: "JWT + Session Management"
      },
      {
        name: "Data Encryption",
        description: "End-to-end data protection",
        tech: "bcrypt + HTTPS/TLS"
      },
      {
        name: "Input Validation",
        description: "Schema-based data validation",
        tech: "Zod + Sanitization"
      },
      {
        name: "Security Headers",
        description: "Protection against common attacks",
        tech: "CORS + CSP + XSS Protection"
      }
    ],
    connections: ["api", "monitoring"]
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    description: "Scalable hosting with CDN and performance optimization",
    icon: <Globe className="w-6 h-6" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    components: [
      {
        name: "Edge Deployment",
        description: "Global content delivery",
        tech: "VPS deployment"
      },
      {
        name: "Static Assets",
        description: "Optimized media serving",
        tech: "CDN + Image Optimization"
      },
      {
        name: "Environment Config",
        description: "Secure configuration management",
        tech: "Environment Variables"
      },
      {
        name: "Monitoring",
        description: "Real-time performance tracking",
        tech: "Custom Analytics + Logging"
      }
    ],
    connections: ["frontend", "cache"]
  }
]

const connectionLines = [
  { from: "frontend", to: "api", path: "M 50 100 Q 150 50 250 100" },
  { from: "api", to: "database", path: "M 250 200 Q 350 150 450 200" },
  { from: "api", to: "ai", path: "M 250 100 Q 200 150 250 200" },
  { from: "ai", to: "database", path: "M 350 200 Q 400 250 450 200" },
  { from: "security", to: "api", path: "M 150 300 Q 200 250 250 200" },
  { from: "database", to: "infrastructure", path: "M 450 300 Q 500 350 550 300" }
]

export function ArchitectureDiagram() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            System Architecture
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Scalable & Secure Architecture
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built on modern cloud-native principles with microservices architecture, 
            ensuring high availability, scalability, and security.
          </p>
        </motion.div>

        {/* Architecture Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="mb-16 relative"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {architectureLayers.map((layer, index) => (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 50, rotateY: 180 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ 
                  duration: 0.8, 
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
                <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden group">
                  <CardHeader className="pb-4 relative">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        className={`${layer.bgColor} p-4 rounded-xl ${layer.color} shadow-lg`}
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        {layer.icon}
                      </motion.div>
                      <div className="flex-1">
                        <CardTitle className="text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                          {layer.name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Layer {index + 1}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-gray-600 leading-relaxed">
                      {layer.description}
                    </CardDescription>

                    {/* Animated background */}
                    <motion.div
                      className={`absolute inset-0 ${layer.bgColor} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                      initial={false}
                    />
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {layer.components.map((component, compIndex) => (
                        <motion.div
                          key={component.name}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + compIndex * 0.05 }}
                          className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors group/component"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm text-gray-900 group-hover/component:text-blue-600 transition-colors">
                              {component.name}
                            </h4>
                            <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                              {component.tech}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {component.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Progress indicator */}
                    <motion.div
                      className="mt-6 h-1 bg-gray-200 rounded-full overflow-hidden"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.8 }}
                    >
                      <motion.div
                        className={`h-full bg-gradient-to-r ${layer.bgColor.replace('bg-', 'from-').replace('-100', '-400')} ${layer.color.replace('text-', 'to-')}`}
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                      />
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Data Flow Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Data Flow & Communication
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "User Request",
                description: "Frontend sends authenticated request",
                icon: <Smartphone className="w-5 h-5" />,
                color: "bg-blue-100 text-blue-600"
              },
              {
                step: "2", 
                title: "API Processing",
                description: "Validation, authentication, and routing",
                icon: <Server className="w-5 h-5" />,
                color: "bg-green-100 text-green-600"
              },
              {
                step: "3",
                title: "AI Analysis",
                description: "Smart processing and decision making",
                icon: <Zap className="w-5 h-5" />,
                color: "bg-purple-100 text-purple-600"
              },
              {
                step: "4",
                title: "Data Response",
                description: "Secure delivery back to frontend",
                icon: <Database className="w-5 h-5" />,
                color: "bg-orange-100 text-orange-600"
              }
            ].map((flow, index) => (
              <motion.div
                key={flow.step}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative"
              >
                <Card className="text-center p-6 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${flow.color}`}>
                    {flow.icon}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-2">
                    {flow.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {flow.description}
                  </div>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 ${flow.color} rounded-full flex items-center justify-center font-bold text-sm`}>
                    {flow.step}
                  </div>
                </Card>

                {index < 3 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                    className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-300 transform -translate-y-1/2"
                  >
                    <div className="absolute right-0 top-1/2 w-2 h-2 bg-gray-400 rounded-full transform translate-x-1 -translate-y-1/2"></div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: <Layers className="w-6 h-6" />,
              title: "99.9% Uptime",
              description: "High availability with redundant systems and automated failover",
              color: "text-green-600 bg-green-100"
            },
            {
              icon: <Zap className="w-6 h-6" />,
              title: "< 100ms Response",
              description: "Optimized API responses with intelligent caching strategies",
              color: "text-blue-600 bg-blue-100"
            },
            {
              icon: <Shield className="w-6 h-6" />,
              title: "Secure by Design",
              description: "Following best practices for security",
              color: "text-red-600 bg-red-100"
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 30, rotateX: 45 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5, rotateX: 5 }}
              className="text-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <motion.div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-6 ${metric.color}`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                {metric.icon}
              </motion.div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                {metric.title}
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {metric.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}