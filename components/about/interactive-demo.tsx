"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Camera, 
  CheckCircle, 
  MapPin, 
  MessageSquare, 
  Play, 
  Star, 
  TrendingUp, 
  Users,
  X,
  ArrowRight,
  Clock,
  AlertTriangle
} from "lucide-react"

interface DemoStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  mockData: {
    title: string
    content: string
    visual?: string
    action?: string
  }
}

const demoSteps: DemoStep[] = [
  {
    id: "report",
    title: "Report Issue",
    description: "Citizen reports a pothole with photo and location",
    icon: <Camera className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    mockData: {
      title: "Street Pothole Reported",
      content: "Large pothole on Main Street causing vehicle damage. Location: 123 Main St, intersection with Oak Ave.",
      visual: "📍 GPS: 40.7128, -74.0060",
      action: "Photo uploaded + Location confirmed"
    }
  },
  {
    id: "ai-process",
    title: "AI Analysis",
    description: "AI categorizes and assigns priority automatically",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    mockData: {
      title: "AI Processing Complete",
      content: "Category: Road Maintenance | Priority: High | Department: Public Works | Estimated cost: $500-800",
      visual: "🤖 Analysis time: 2.3 seconds",
      action: "Auto-assigned to Public Works Dept."
    }
  },
  {
    id: "assignment",
    title: "Smart Assignment",
    description: "Issue assigned to relevant department official",
    icon: <Users className="w-5 h-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    mockData: {
      title: "Assigned to John Smith",
      content: "Public Works Supervisor | Zone 3 | Avg response: 24hrs | Current workload: 12 active issues",
      visual: "👷 John Smith - Public Works",
      action: "Email notification sent"
    }
  },
  {
    id: "engagement",
    title: "Community Votes",
    description: "Other citizens upvote and add supporting evidence",
    icon: <Star className="w-5 h-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    mockData: {
      title: "Community Support",
      content: "47 upvotes | 12 comments | 5 additional photos | 3 similar reports merged",
      visual: "⭐ 47 votes in 2 hours",
      action: "Priority escalated to Very High"
    }
  },
  {
    id: "progress",
    title: "Progress Updates",
    description: "Official provides status updates with photos",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    mockData: {
      title: "Work In Progress",
      content: "Repair crew dispatched. Materials ordered. Expected completion: Tomorrow 3PM. Before/after photos attached.",
      visual: "🚧 Status: In Progress (Day 1)",
      action: "Real-time notification sent to 89 followers"
    }
  },
  {
    id: "completion",
    title: "Issue Resolved",
    description: "Community verifies completion and provides feedback",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    mockData: {
      title: "Issue Completed ✅",
      content: "Pothole filled and road surface restored. Community satisfaction: 4.8/5 stars. Total resolution time: 28 hours.",
      visual: "✅ Completed in 28 hours",
      action: "Case closed + Performance metrics updated"
    }
  }
]

export function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % demoSteps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + demoSteps.length) % demoSteps.length)
  }

  const startAutoPlay = () => {
    setAutoPlay(true)
    setIsPlaying(true)
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % demoSteps.length
        if (next === 0) {
          clearInterval(interval)
          setAutoPlay(false)
          setIsPlaying(false)
        }
        return next
      })
    }, 3000)
  }

  const stopAutoPlay = () => {
    setAutoPlay(false)
    setIsPlaying(false)
  }

  const currentStepData = demoSteps[currentStep]

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            Interactive Demo
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            See CivicResolve in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience the complete lifecycle of a civic issue from report to resolution. 
            Watch how AI and community engagement work together.
          </p>
          
          {/* Demo Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button
              onClick={isPlaying ? stopAutoPlay : startAutoPlay}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={autoPlay && isPlaying}
            >
              {isPlaying ? <X className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? "Stop Demo" : "Start Auto Demo"}
            </Button>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {demoSteps.length}
            </div>
          </div>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center space-x-2 mb-8">
            {demoSteps.map((step, index) => (
              <motion.button
                key={step.id}
                onClick={() => !autoPlay && setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? currentStepData.bgColor.replace('bg-', 'bg-') + ' scale-125'
                    : index < currentStep 
                      ? 'bg-green-300' 
                      : 'bg-gray-200 hover:bg-gray-300'
                } ${!autoPlay ? 'cursor-pointer' : 'cursor-default'}`}
                whileHover={!autoPlay ? { scale: 1.2 } : {}}
                whileTap={!autoPlay ? { scale: 0.9 } : {}}
              />
            ))}
          </div>

          <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-4">
            {demoSteps.map((step, index) => (
              <motion.button
                key={step.id}
                onClick={() => !autoPlay && setCurrentStep(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                  index === currentStep
                    ? `${step.bgColor} ${step.color} border-2 border-current`
                    : index < currentStep
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                } ${!autoPlay ? 'cursor-pointer' : 'cursor-default'}`}
                whileHover={!autoPlay ? { scale: 1.05 } : {}}
                disabled={autoPlay}
              >
                <span className={`p-1 rounded ${index === currentStep ? 'bg-white/20' : 'bg-white/50'}`}>
                  {step.icon}
                </span>
                <span className="text-sm font-medium">{step.title}</span>
                {index < currentStep && <CheckCircle className="w-4 h-4" />}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Main Demo Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Demo Visualization */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -50, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: 50, rotateY: 15 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="relative"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className={`${currentStepData.bgColor} p-4 rounded-xl ${currentStepData.color} shadow-lg`}
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: autoPlay ? Infinity : 0, ease: "linear" }}
                  >
                    {currentStepData.icon}
                  </motion.div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900">
                      {currentStepData.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {currentStepData.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {(currentStep + 1).toString().padStart(2, '0')}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Mock Interface */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-50 rounded-lg p-6 border-2 border-gray-100"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-2 h-2 rounded-full ${currentStepData.bgColor.replace('bg-', 'bg-').replace('-100', '-400')} mt-2`}></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {currentStepData.mockData.title}
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">
                        {currentStepData.mockData.content}
                      </p>
                      {currentStepData.mockData.visual && (
                        <div className="bg-white rounded-md p-3 text-sm text-gray-600 font-mono border">
                          {currentStepData.mockData.visual}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {currentStepData.mockData.action && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      className={`${currentStepData.bgColor} ${currentStepData.color} rounded-md p-3 text-sm font-medium flex items-center gap-2`}
                    >
                      <Clock className="w-4 h-4" />
                      {currentStepData.mockData.action}
                    </motion.div>
                  )}
                </motion.div>

                {/* Interactive Elements */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center justify-between pt-4 border-t border-gray-100"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                    disabled={autoPlay}
                    className="flex items-center gap-2"
                  >
                    ← Previous
                  </Button>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <motion.div
                      animate={autoPlay ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-green-400 rounded-full"
                    />
                    {autoPlay ? "Auto Playing..." : "Manual Control"}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextStep}
                    disabled={autoPlay}
                    className="flex items-center gap-2"
                  >
                    Next →
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step Information */}
          <motion.div
            key={`info-${currentStep}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  What's Happening
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      icon: <Camera className="w-4 h-4" />,
                      text: "Real-time data processing",
                      active: currentStep >= 0
                    },
                    {
                      icon: <TrendingUp className="w-4 h-4" />,
                      text: "AI-powered analysis",
                      active: currentStep >= 1
                    },
                    {
                      icon: <Users className="w-4 h-4" />,
                      text: "Smart task assignment",
                      active: currentStep >= 2
                    },
                    {
                      icon: <Star className="w-4 h-4" />,
                      text: "Community engagement",
                      active: currentStep >= 3
                    },
                    {
                      icon: <CheckCircle className="w-4 h-4" />,
                      text: "Progress transparency",
                      active: currentStep >= 4
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: item.active ? 1 : 0.4, 
                        x: 0,
                        scale: item.active ? 1 : 0.95
                      }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                        item.active 
                          ? 'bg-white shadow-md border border-gray-100' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        item.active 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-sm font-medium ${
                        item.active ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {item.text}
                      </span>
                      {item.active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Demo Statistics */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Demo Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Processing Time", value: "< 5 sec", icon: "⚡" },
                    { label: "Accuracy Rate", value: "94%", icon: "🎯" },
                    { label: "Response Time", value: "24 hrs", icon: "⏱️" },
                    { label: "Satisfaction", value: "4.8/5", icon: "⭐" }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                      className="text-center p-4 bg-white rounded-lg shadow-sm"
                    >
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-600">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}