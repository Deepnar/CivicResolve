"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bot, 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Wrench, 
  Lightbulb,
  Shield,
  Target,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"

interface AIAnalysis {
  issues: Array<{
    type: string
    severity: "Minor" | "Moderate" | "Severe"
    priority: "Low" | "Medium" | "High" | "Urgent"
    description: string
  }>
  safety_concerns: string
  public_impact: string
  resources_needed: {
    equipment: string[]
    materials: string[]
    estimated_cost: string
    estimated_time: string
  }
  immediate_actions: string[]
  prevention_measures: string[]
  recommended_category: string
  confidence_score: string
}

interface AIAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl?: string
  issueId?: string
}

export default function AIAnalysisModal({ isOpen, onClose, imageUrl, issueId }: AIAnalysisModalProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB")
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedImage(result)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    const imageToAnalyze = uploadedImage || imageUrl
    if (!imageToAnalyze) {
      toast.error("Please provide an image to analyze")
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageData: imageToAnalyze,
          issueId: issueId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }

      const result = await response.json()
      setAnalysis(result.analysis)
      toast.success("Image analysis completed successfully!")

    } catch (error) {
      console.error('Error analyzing image:', error)
      toast.error(error instanceof Error ? error.message : "Failed to analyze image")
    } finally {
      setAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Severe': return 'bg-red-100 text-red-800 border-red-200'
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Minor': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">AI Issue Analysis</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!analysis ? (
            <div className="space-y-6">
              {/* Image Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Image to Analyze</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {imageUrl || uploadedImage ? (
                    <div className="space-y-4">
                      <img
                        src={uploadedImage || imageUrl}
                        alt="Issue to analyze"
                        className="w-full h-64 object-cover rounded-lg border"
                      />
                      {!imageUrl && (
                        <div className="flex space-x-2">
                          <label className="flex-1">
                            <Button variant="outline" className="w-full">
                              <Upload className="h-4 w-4 mr-2" />
                              Change Image
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500 font-medium">
                          Upload an image to analyze
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        Maximum file size: 5MB
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analyze Button */}
              <div className="flex justify-center">
                <Button
                  onClick={analyzeImage}
                  disabled={analyzing || (!imageUrl && !uploadedImage)}
                  className="px-8 py-3"
                >
                  {analyzing ? (
                    <>
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Analysis Results */
            <div className="space-y-6">
              {/* Confidence Score */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Analysis Confidence</span>
                  <Badge variant="secondary">{analysis.confidence_score}</Badge>
                </div>
              </div>

              {/* Detected Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span>Detected Issues</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.issues.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{issue.type}</h4>
                          <div className="flex space-x-2">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge className={getPriorityColor(issue.priority)}>
                              {issue.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{issue.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Safety & Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      <span>Safety Concerns</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{analysis.safety_concerns}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span>Public Impact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{analysis.public_impact}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Resources Needed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-green-600" />
                    <span>Resources Needed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <Wrench className="h-4 w-4 mr-1" />
                        Equipment
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {analysis.resources_needed.equipment.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        Materials
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {analysis.resources_needed.materials.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Estimated Cost:</span>
                      <span className="text-sm text-gray-600">{analysis.resources_needed.estimated_cost}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Estimated Time:</span>
                      <span className="text-sm text-gray-600">{analysis.resources_needed.estimated_time}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-orange-600" />
                      <span>Immediate Actions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-700 space-y-2">
                      {analysis.immediate_actions.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-orange-600 mr-2">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      <span>Prevention Measures</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-700 space-y-2">
                      {analysis.prevention_measures.map((measure, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-2">•</span>
                          {measure}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recommended Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-lg">
                    {analysis.recommended_category}
                  </Badge>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setAnalysis(null)}
                >
                  Analyze Another Image
                </Button>
                <Button onClick={onClose}>
                  Close Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}