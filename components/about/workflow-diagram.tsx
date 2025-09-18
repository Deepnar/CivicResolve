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
    id: "report",
    title: "Issue Reporting",
    description: "Citizens report civic issues with photos, location, and detailed descriptions",
    icon: <MapPin className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    details: [
      "GPS-based location tracking",
      "Photo upload with image compression",
      "Category selection and prioritization",
      "Real-time validation and feedback"
    ],
    metrics: {
      label: "Avg. Report Time",
      value: "< 3 min"
    }
  },
  {
    id: "ai-analysis",
    title: "AI Processing",
    description: "Advanced AI analyzes reports for categorization, urgency, and routing",
    icon: <Zap className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    details: [
      "Google Gemini AI integration",
      "Automatic categorization",
      "Urgency level assessment",
      "Duplicate detection and merging"
    ],
    metrics: {
      label: "Processing Speed",
      value: "< 5 sec"
    }
  },
  {
    id: "assignment",
    title: "Smart Assignment",
    description: "Issues are automatically assigned to relevant departments and officials",
    icon: <Users className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    details: [
      "Department routing based on category",
      "Official assignment by jurisdiction",
      "Workload balancing algorithms",
      "Escalation path configuration"
    ],
    metrics: {
      label: "Assignment Accuracy",
      value: "94%"
    }
  },
  {
    id: "engagement",
    title: "Community Engagement",
    description: "Citizens vote, comment, and track progress in real-time",
    icon: <Vote className="w-6 h-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    details: [
      "Upvoting and priority ranking",
      "Real-time comment threads",
      "Photo evidence sharing",
      "Progress tracking dashboard"
    ],
    metrics: {
      label: "Engagement Rate",
      value: "73%"
    }
  },
  {
    id: "resolution",
    title: "Progress Tracking",
    description: "Transparent status updates and completion verification",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
    details: [
      "Multi-stage status tracking",
      "Photo verification system",
      "Automated notification system",
      "Performance analytics"
    ],
    metrics: {
      label: "Resolution Rate",
      value: "87%"
    }
  },
  {
    id: "feedback",
    title: "AI Chat Support",
    description: "24/7 intelligent assistance for citizens and officials",
    icon: <MessageSquare className="w-6 h-6" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    details: [
      "Context-aware responses",
      "Multi-language support",
      "FAQ automation",
      "Escalation to human support"
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
            Seamless Civic Issue Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From problem identification to resolution, our AI-powered workflow 
            ensures efficient processing and transparent communication.
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