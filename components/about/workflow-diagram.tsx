"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Clock, MapPin, MessageSquare, TrendingUp, Users, Vote, Zap } from "lucide-react"

interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  details: string[]
  metrics?: {
    label: string
    value: string
  }
}

const workflowSteps: WorkflowStep[] = [
  {
    id: "ai-report",
    title: "AI-Powered Reporting",
    description: "Citizens upload photos and AI automatically generates comprehensive issue reports",
    icon: <MapPin className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    details: [
      "Photo-first workflow with instant AI analysis",
      "Automatic title and description generation",
      "Citizen review and editing interface",
      "GPS-based location tracking and validation"
    ],
    metrics: {
      label: "Avg. Report Time",
      value: "< 2 min"
    }
  },
  {
    id: "ai-processing",
    title: "Intelligent Analysis",
    description: "Advanced AI processes images and content for optimal categorization and routing",
    icon: <Zap className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    details: [
      "Google Gemini computer vision analysis",
      "Automated content quality enhancement",
      "Smart categorization suggestions",
      "Duplicate detection and merging"
    ],
    metrics: {
      label: "Processing Speed",
      value: "< 5 sec"
    }
  },
  {
    id: "smart-assignment",
    title: "Organization Routing",
    description: "Issues automatically routed to appropriate organizations with AI-enhanced insights",
    icon: <Users className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    details: [
      "Category-based organization assignment",
      "AI analysis available for admins",
      "Workload balancing across teams",
      "Email notification workflows"
    ],
    metrics: {
      label: "Assignment Accuracy",
      value: "96%"
    }
  },
  {
    id: "admin-analysis",
    title: "Professional AI Analysis", 
    description: "Organization admins get detailed AI infrastructure analysis for informed decisions",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    details: [
      "Professional infrastructure assessment",
      "Safety risk evaluation and planning",
      "Resource and cost estimation",
      "Prevention strategy recommendations"
    ],
    metrics: {
      label: "Analysis Depth",
      value: "8 categories"
    }
  },
  {
    id: "engagement",
    title: "Community Engagement",
    description: "Citizens vote, comment, and track progress with engagement-based priority visualization",
    icon: <Vote className="w-6 h-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    details: [
      "Dynamic priority color coding",
      "Real-time voting and commenting",
      "Engagement-based issue ranking",
      "Progress tracking dashboard"
    ],
    metrics: {
      label: "Engagement Rate",
      value: "78%"
    }
  },
  {
    id: "ai-support",
    title: "AI Assistant Support",
    description: "24/7 intelligent assistance with real-time platform data integration",
    icon: <MessageSquare className="w-6 h-6" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    details: [
      "Context-aware conversational AI",
      "Real-time platform statistics",
      "Role-based intelligent responses",
      "Instant issue and user insights"
    ],
    metrics: {
      label: "Response Time",
      value: "< 1 sec"
    }
  }
]

export function WorkflowDiagram() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            How It Works
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            AI-Enhanced Civic Issue Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From AI-powered photo analysis to professional infrastructure assessment, 
            our intelligent workflow ensures efficient processing and transparent communication.
          </p>
        </motion.div>

        {/* Main Workflow Timeline */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-blue-200 via-purple-200 to-cyan-200"></div>

          <div className="space-y-16">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={`flex flex-col lg:flex-row items-center gap-8 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                {/* Content Card */}
                <div className="flex-1 max-w-lg">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-4 mb-3">
                          <motion.div
                            className={`${step.bgColor} p-4 rounded-xl ${step.color}`}
                            whileHover={{ rotate: 360, scale: 1.1 }}
                            transition={{ duration: 0.6 }}
                          >
                            {step.icon}
                          </motion.div>
                          <div className="flex-1">
                            <CardTitle className="text-xl text-gray-900 mb-2">
                              {step.title}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              Step {index + 1}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-gray-600 text-base leading-relaxed">
                          {step.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {/* Feature details */}
                        <div className="space-y-2 mb-4">
                          {step.details.map((detail, detailIndex) => (
                            <motion.div
                              key={detailIndex}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + detailIndex * 0.05 }}
                              className="flex items-center gap-2 text-sm text-gray-600"
                            >
                              <div className={`w-2 h-2 rounded-full ${step.bgColor.replace('bg-', 'bg-').replace('-100', '-400')}`}></div>
                              {detail}
                            </motion.div>
                          ))}
                        </div>

                        {/* Metrics */}
                        {step.metrics && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                            className={`${step.bgColor} rounded-lg p-3 text-center`}
                          >
                            <div className="text-xs text-gray-600 mb-1">
                              {step.metrics.label}
                            </div>
                            <div className={`text-lg font-bold ${step.color}`}>
                              {step.metrics.value}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Timeline indicator */}
                <div className="hidden lg:flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: 180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.6, type: "spring" }}
                    className={`w-16 h-16 ${step.bgColor} rounded-full flex items-center justify-center ${step.color} shadow-lg relative z-10`}
                  >
                    <div className="text-2xl font-bold">
                      {index + 1}
                    </div>
                  </motion.div>
                </div>

                {/* Arrow connector (except for last item) */}
                <div className="flex-1 max-w-lg flex justify-center lg:hidden">
                  {index < workflowSteps.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2 + 0.3 }}
                      className="text-gray-400"
                    >
                      <ArrowRight className="w-8 h-8 rotate-90" />
                    </motion.div>
                  )}
                </div>

                {/* Placeholder for reverse layout */}
                <div className="flex-1 max-w-lg hidden lg:block">
                  {/* Empty space for alternating layout */}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Workflow Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              icon: <Clock className="w-6 h-6" />,
              title: "90% Faster",
              description: "Issue processing compared to traditional systems",
              color: "text-blue-600 bg-blue-100"
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "85% Satisfaction",
              description: "Citizen satisfaction with transparency and engagement",
              color: "text-green-600 bg-green-100"
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "40% More Efficient",
              description: "Department resource allocation and task management",
              color: "text-purple-600 bg-purple-100"
            },
            {
              icon: <MessageSquare className="w-6 h-6" />,
              title: "24/7 Support",
              description: "AI-powered assistance for continuous engagement",
              color: "text-orange-600 bg-orange-100"
            }
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <motion.div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${benefit.color}`}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                {benefit.icon}
              </motion.div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {benefit.title}
              </h4>
              <p className="text-sm text-gray-600">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}