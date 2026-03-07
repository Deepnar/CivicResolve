"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send, ArrowLeft, Bot, Check, X, Edit, Camera, Upload } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { logger } from "@/lib/logger"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { ISSUE_CATEGORIES } from "@/lib/constants"
import type { IssueCategory } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"

// Load LocationPicker dynamically with SSR disabled
const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <LoadingSpinner size="md" text="Loading map..." />
  </div>
})

const reportIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["ROADS", "LIGHTING", "SANITATION", "PARKS", "UTILITIES", "SAFETY", "ENVIRONMENT", "VANDALISM", "TRANSPORTATION", "NOISE", "OTHER"]),
  address: z.string().min(5, "Address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isAnonymous: z.boolean().optional(),
  // NGO-specific fields
  citizen_name: z.string().optional(),
  citizen_phone: z.string().optional(),
  ngo_notes: z.string().optional(),
})

type ReportIssueForm = z.infer<typeof reportIssueSchema>

export default function ReportIssuePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  
  // AI Auto-fill states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string
    description: string
    category: string
    confidence: string
  } | null>(null)
  const [showAiReview, setShowAiReview] = useState(false)
  const [useManualInput, setUseManualInput] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportIssueForm>({
    resolver: zodResolver(reportIssueSchema),
  })

  const selectedCategory = watch("category")
  const currentAddress = watch("address")
  const currentLatitude = watch("latitude")
  const currentLongitude = watch("longitude")

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 5MB"
        })
        return
      }
      
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          // Calculate new dimensions (max 800px width/height)
          let { width, height } = img
          const maxSize = 800
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
          
          canvas.width = width
          canvas.height = height
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
          setImagePreview(compressedDataUrl)
          
          // Trigger AI analysis
          analyzeImageWithAI(compressedDataUrl)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImageWithAI = async (imageData: string) => {
    setIsAnalyzing(true)
    setAiSuggestions(null)
    setShowAiReview(false)
    setUseManualInput(false)

    try {
      const response = await fetch('/api/ai/auto-fill-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageData: imageData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }

      const result = await response.json()
      setAiSuggestions(result.autoFill)
      setShowAiReview(true)

      toast({
        title: "AI Analysis Complete",
        description: "Review the suggested title and description below"
      })

    } catch (error) {
      console.error('Error analyzing image:', error)
      toast({
        variant: "destructive",
        title: "AI Analysis Failed", 
        description: "Please enter title and description manually"
      })
      setUseManualInput(true)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const acceptAiSuggestions = () => {
    if (aiSuggestions) {
      setValue("title", aiSuggestions.title)
      setValue("description", aiSuggestions.description)
      setValue("category", aiSuggestions.category as IssueCategory)
      setShowAiReview(false)
      
      toast({
        title: "AI Suggestions Applied",
        description: "Please select a location to complete your report"
      })
    }
  }

  const rejectAiSuggestions = () => {
    setUseManualInput(true)
    setShowAiReview(false)
    setAiSuggestions(null)
  }

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setValue("latitude", lat)
    setValue("longitude", lng)
    setValue("address", address)
    setShowLocationPicker(false)
  }

  const handleAddressSelect = (lat: number, lng: number, selectedAddress: string) => {
    setValue("latitude", lat)
    setValue("longitude", lng)
    setValue("address", selectedAddress)
    // If location picker is open, we want to show this location on the map
    if (showLocationPicker) {
      // The location picker will automatically update its map when the address changes
    }
  }

  const onSubmit = async (data: ReportIssueForm) => {
    setIsSubmitting(true)
    try {
      // Check if user is authenticated (we rely on httpOnly cookies now)
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please login to report an issue"
        })
        return
      }

      // Prepare the API data
      const apiData = {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: "MEDIUM", // Default priority
        latitude: data.latitude || 19.0760, // Default to Mumbai center if not set
        longitude: data.longitude || 72.8777, // Default to Mumbai center if not set
        address: data.address,
        is_anonymous: isAnonymous,
        image_url: imagePreview && imagePreview.startsWith('data:') ? imagePreview : null, // Only send valid data URLs
        // Include NGO fields if user is NGO admin
        ...(user?.role === 'NGO_ADMIN' && {
          citizen_name: data.citizen_name,
          citizen_phone: data.citizen_phone,
          ngo_notes: data.ngo_notes,
        })
      }

      // Submit to API
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin", // Include httpOnly cookies
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('Issue submission failed', undefined, 'ReportPage', { 
          status: response.status, 
          errorData 
        })
        
        if (errorData.details) {
          // Show specific validation errors
          const errorMessages = Object.entries(errorData.details).map(([field, messages]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          ).join('\n')
          
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: errorMessages
          })
        } else {
          throw new Error(errorData.error || "Failed to submit issue")
        }
        return
      }

      const result = await response.json()
      
      // Show success message
      toast({
        title: "Success!",
        description: "Issue reported successfully!"
      })
      
      // Reset form or redirect
      router.push("/")
    } catch (error) {
      logger.error('Issue submission error', error instanceof Error ? error : new Error(String(error)), 'ReportPage')
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit issue"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <PageHeader
          title="Report an Issue"
          description="Help improve your community by reporting civic issues"
          icon={Send}
        >
          <Button variant="outline" className="gap-2 bg-transparent touch-target" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </PageHeader>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Form */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="font-heading text-lg sm:text-xl">Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  {/* Photo Upload Section - Now First */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Upload Photo for AI Analysis
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      {imagePreview ? (
                        <div className="space-y-3 sm:space-y-4">
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="max-h-32 sm:max-h-48 mx-auto rounded-lg object-cover"
                          />
                          {isAnalyzing && (
                            <div className="flex items-center justify-center gap-2 text-blue-600">
                              <LoadingSpinner size="sm" />
                              <span className="text-sm">AI is analyzing your photo...</span>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="touch-target"
                            onClick={() => {
                              setSelectedImage(null)
                              setImagePreview(null)
                              setAiSuggestions(null)
                              setShowAiReview(false)
                              setUseManualInput(false)
                            }}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-gray-500">
                            <Bot className="mx-auto h-8 w-8 sm:h-12 sm:w-12" />
                          </div>
                          <div className="text-sm text-gray-600">
                            <label htmlFor="image-upload" className="cursor-pointer text-blue-600 hover:text-blue-500 touch-target-inline">
                              Upload a photo
                            </label>
                            <span className="mx-2 text-gray-400">|</span>
                            <label htmlFor="camera-upload" className="cursor-pointer text-green-600 hover:text-green-500 touch-target-inline">
                              Take Photo
                            </label>
                            <p className="text-xs text-gray-500 mt-1">AI will auto-fill title & description</p>
                          </div>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <input
                            id="camera-upload"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Review Section */}
                  {showAiReview && aiSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-blue-200 rounded-lg p-4 bg-blue-50/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium text-blue-900">AI Generated Details</h3>
                        <Badge variant="outline" className="text-xs">
                          {aiSuggestions.confidence} confidence
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-blue-800">Suggested Title:</Label>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {aiSuggestions.title}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-blue-800">Suggested Description:</Label>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {aiSuggestions.description}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-blue-800">Suggested Category:</Label>
                          <div className="bg-white p-2 rounded border flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ISSUE_CATEGORIES[aiSuggestions.category as IssueCategory]?.color || '#6B7280' }}
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              {ISSUE_CATEGORIES[aiSuggestions.category as IssueCategory]?.label || aiSuggestions.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          type="button"
                          onClick={acceptAiSuggestions}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Use These Details
                        </Button>
                        <Button
                          type="button"
                          onClick={rejectAiSuggestions}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          Enter Manually
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Title - Only show if manual input or AI accepted */}
                  {(useManualInput || (!showAiReview && !isAnalyzing)) && (
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                        Issue Title *
                        {!imagePreview && (
                          <span className="text-xs text-gray-500">(Upload photo for AI auto-fill)</span>
                        )}
                      </Label>
                      <Input
                        id="title"
                        placeholder="Brief, descriptive title of the issue"
                        {...register("title")}
                        className={`h-11 text-base ${errors.title ? "border-red-500" : ""}`}
                      />
                      {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
                    </div>
                  )}

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Category *
                      {aiSuggestions && !showAiReview && (
                        <span className="text-xs text-blue-600 ml-2">(AI suggested)</span>
                      )}
                    </Label>
                    <Select 
                      value={selectedCategory}
                      onValueChange={(value) => setValue("category", value as IssueCategory)}
                    >
                      <SelectTrigger className={`h-11 ${errors.category ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select issue category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ISSUE_CATEGORIES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
                  </div>

                  {/* Description - Only show if manual input or AI accepted */}
                  {(useManualInput || (!showAiReview && !isAnalyzing)) && (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide detailed information about the issue, including any relevant context or urgency"
                        rows={4}
                        {...register("description")}
                        className={`min-h-[100px] text-base resize-none ${errors.description ? "border-red-500" : ""}`}
                      />
                      {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                    </div>
                  )}

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">Location *</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <AddressAutocomplete
                        value={currentAddress || ""}
                        onChange={(value) => setValue("address", value)}
                        onSelect={handleAddressSelect}
                        placeholder="Start typing an address in Mumbai..."
                        className={`flex-1 h-11 text-base ${errors.address ? "border-red-500" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="touch-target w-full sm:w-auto shrink-0"
                        onClick={() => setShowLocationPicker(true)}
                      >
                        Pick on Map
                      </Button>
                    </div>
                    {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
                  </div>

                  {/* NGO-specific fields (only shown for NGO admins) */}
                  {user?.role === 'NGO_ADMIN' && (
                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="font-medium text-sm">NGO Reporting Details</span>
                      </div>
                      
                      {/* Citizen Name */}
                      <div className="space-y-2">
                        <Label htmlFor="citizen_name" className="text-sm font-medium">Citizen Name</Label>
                        <Input
                          id="citizen_name"
                          placeholder="Name of the citizen reporting this issue"
                          {...register("citizen_name")}
                          className="h-11 text-base"
                        />
                        {errors.citizen_name && <p className="text-sm text-red-600">{errors.citizen_name.message}</p>}
                      </div>

                      {/* Citizen Phone */}
                      <div className="space-y-2">
                        <Label htmlFor="citizen_phone" className="text-sm font-medium">Citizen Phone</Label>
                        <Input
                          id="citizen_phone"
                          placeholder="Phone number of the citizen (optional)"
                          {...register("citizen_phone")}
                          className="h-11 text-base"
                        />
                        {errors.citizen_phone && <p className="text-sm text-red-600">{errors.citizen_phone.message}</p>}
                      </div>

                      {/* NGO Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="ngo_notes" className="text-sm font-medium">NGO Notes</Label>
                        <Textarea
                          id="ngo_notes"
                          placeholder="Additional notes from your NGO about this report"
                          rows={3}
                          {...register("ngo_notes")}
                          className="min-h-[80px] text-base resize-none"
                        />
                        {errors.ngo_notes && <p className="text-sm text-red-600">{errors.ngo_notes.message}</p>}
                      </div>
                    </div>
                  )}

                  {/* Anonymous Reporting Toggle */}
                  <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="anonymous"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="anonymous" className="text-sm font-medium cursor-pointer">
                          Submit this report anonymously
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Your identity will not be visible publicly or to organizations handling the issue. 
                          Your report will be attributed to "Anonymous Citizen" for privacy.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white touch-target h-12 text-base font-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Submit Issue Report
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Preview/Tips */}
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="font-heading text-lg sm:text-xl">Reporting Tips</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                      <p>Be specific and descriptive in your title and description</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                      <p>Include photos when possible to help authorities understand the issue</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                      <p>Provide accurate location information for faster response</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                      <p>Check if the issue has already been reported to avoid duplicates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ISSUE_CATEGORIES[selectedCategory as IssueCategory].color }}
                    />
                    <h3 className="font-medium text-gray-900">
                      {ISSUE_CATEGORIES[selectedCategory as IssueCategory].label}
                    </h3>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl h-[600px] flex flex-col" style={{ overflow: 'visible' }}>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-heading text-lg">Select Location</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowLocationPicker(false)}>
                  ✕
                </Button>
              </div>
              <div className="flex-1" style={{ overflow: 'visible' }}>
                {/* Location Picker Component */}
                <LocationPicker 
                  onLocationSelect={handleLocationSelect} 
                  initialAddress={currentAddress} 
                  initialLat={currentLatitude}
                  initialLng={currentLongitude}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
