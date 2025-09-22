"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MapPin, Users, MessageSquare, BarChart3, Shield, Zap,
  Bell, Bot, Mail, Building2, Eye, Activity, ArrowRight,
  CheckCircle, Star, Target, Award
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Feature {
  icon: React.ElementType
  title: string
  description: string
  highlights: string[]
  color: string
  bgColor: string
  details: string
  tag?: string
}

const featureCategories = {
  core: {
    title: "Core Platform",
    features: [
      {
        icon: MapPin,
        title: "Interactive Map System",
        description: "Precise issue location selection and visualization with engagement-based priority colors",
        highlights: [
          "Leaflet integration with real-time updates",
          "Engagement-based color coding",
          "Geographic analytics and trends",
          "Smart location search"
        ],
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        details: "Citizens can report issues with pixel-perfect accuracy using our interactive map system. Issues are automatically color-coded based on community engagement levels.",
        tag: "Enhanced"
      },
      {
        icon: Users,
        title: "Organization Management",
        description: "Multi-organization support with category-based routing and role management",
        highlights: [
          "Multiple civic organizations",
          "Automatic issue routing",
          "Role-based permissions",
          "Assignment workflows"
        ],
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        details: "Complete organization ecosystem allowing municipal departments to manage their specific areas of responsibility.",
        tag: "New"
      },
      {
        icon: MessageSquare,
        title: "Community Engagement",
        description: "Voting, commenting, and discussion system for democratic issue prioritization",
        highlights: [
          "Upvote System",
          "Threaded discussions",
          "Community metrics",
          "Democratic prioritization"
        ],
        color: "text-green-600",
        bgColor: "bg-green-100",
        details: "Foster community engagement through voting and discussion features that help prioritize the most important issues."
      }
    ]
  },
  intelligent: {
    title: "AI & Intelligence",
    features: [
      {
        icon: Bot,
        title: "AI Image Analysis",
        description: "Google Gemini-powered infrastructure analysis for organization admins",
        highlights: [
          "Professional damage assessment",
          "Safety risk evaluation", 
          "Resource planning assistance",
          "Prevention recommendations"
        ],
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        details: "Organization admins get comprehensive AI analysis of infrastructure issues with professional insights for decision-making.",
        tag: "NEW"
      },
      {
        icon: Zap,
        title: "AI Auto-Fill Reports",
        description: "Instant report generation from photos for citizens",
        highlights: [
          "Photo-to-report workflow",
          "Automatic title generation",
          "Smart descriptions",
          "Sub-5 second processing"
        ],
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        details: "Citizens simply upload photos and AI creates complete issue reports automatically with intelligent title and description generation.",
        tag: "NEW"
      },
      {
        icon: MessageSquare,
        title: "AI Chat Assistant",
        description: "Intelligent assistant with real-time platform data integration",
        highlights: [
          "Natural language processing",
          "Real-time platform statistics",
          "Context-aware responses",
          "Role-based information"
        ],
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        details: "Our AI assistant provides instant insights, helps with navigation, and answers questions using live platform data.",
        tag: "Enhanced"
      },
      {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Comprehensive performance monitoring and community insights",
        highlights: [
          "Live performance metrics",
          "Community engagement analytics",
          "Resolution time tracking",
          "Geographic distribution analysis"
        ],
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        details: "Get deep insights into community engagement, issue resolution patterns, and platform performance."
      },
      {
        icon: Target,
        title: "Smart Prioritization",
        description: "Engagement-based priority system with visual indicators",
        highlights: [
          "Community engagement scoring",
          "Dynamic color coding",
          "Fire emoji indicators",
          "Automatic sorting"
        ],
        color: "text-red-600",
        bgColor: "bg-red-100",
        details: "Issues are automatically prioritized based on community engagement, ensuring the most important problems get attention first.",
        tag: "Smart"
      }
    ]
  },
  enterprise: {
    title: "Enterprise Features",
    features: [
      {
        icon: Shield,
        title: "Enterprise Security",
        description: "Production-ready security with comprehensive protection",
        highlights: [
          "JWT authentication",
          "Input sanitization",
          "Security headers",
          "Environment validation"
        ],
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        details: "Bank-level security implementation with comprehensive protection against common vulnerabilities."
      },
      {
        icon: Mail,
        title: "Email Notifications",
        description: "Professional email system for all workflow events",
        highlights: [
          "Assignment notifications",
          "Status update emails",
          "Organization welcome emails",
          "Responsive HTML templates"
        ],
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        details: "Keep everyone informed with beautiful, professional email notifications for every important event.",
        tag: "Professional"
      },
      {
        icon: Activity,
        title: "Performance Monitoring",
        description: "Real-time system health and performance tracking",
        highlights: [
          "API response time tracking",
          "Memory usage monitoring",
          "System health metrics",
          "Performance optimization alerts"
        ],
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        details: "Complete visibility into system performance with real-time monitoring and optimization recommendations."
      }
    ]
  }
}

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState("core")
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            Feature Showcase
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Comprehensive Civic Platform
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the powerful features that make CivicResolve the most advanced 
            civic engagement platform available today.
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-8 sm:mb-12 bg-white/80 backdrop-blur-sm h-auto">
            {Object.entries(featureCategories).map(([key, category]) => (
              <TabsTrigger key={key} value={key} className="text-sm sm:text-lg py-2 sm:py-3 whitespace-nowrap">
                {category.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(featureCategories).map(([key, category]) => (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {category.features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      type: "spring"
                    }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => setSelectedFeature(feature)}
                    className="cursor-pointer"
                  >
                    <Card className="h-full bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group">
                      <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className={`${feature.bgColor} p-2 sm:p-3 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                            <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.color}`} />
                          </div>
                          {feature.tag && (
                            <Badge variant="secondary" className="text-xs">
                              {feature.tag}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg sm:text-xl mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600 text-sm sm:text-base leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <ul className="space-y-2 mb-4">
                          {feature.highlights.map((highlight, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + i * 0.05 }}
                              className="flex items-start text-xs sm:text-sm text-gray-600"
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="leading-relaxed">{highlight}</span>
                            </motion.li>
                          ))}
                        </ul>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-4 group-hover:bg-blue-50 transition-colors text-sm"
                        >
                          Learn More
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Feature Detail Modal */}
        <AnimatePresence>
          {selectedFeature && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
              onClick={() => setSelectedFeature(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`${selectedFeature.bgColor} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                      <selectedFeature.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${selectedFeature.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                        {selectedFeature.title}
                      </h3>
                      {selectedFeature.tag && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {selectedFeature.tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeature(null)} className="flex-shrink-0 ml-2">
                    ✕
                  </Button>
                </div>
                
                <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                  {selectedFeature.details}
                </p>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {selectedFeature.highlights.map((highlight, i) => (
                    <div key={i} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <Star className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 leading-relaxed">{highlight}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}