"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send, ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ISSUE_CATEGORIES } from "@/lib/constants"
import type { IssueCategory } from "@/lib/types"

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
  category: z.enum(["ROADS", "LIGHTING", "SANITATION", "PARKS", "UTILITIES", "SAFETY", "OTHER"]),
  address: z.string().min(5, "Address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type ReportIssueForm = z.infer<typeof reportIssueSchema>

export default function ReportIssuePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Please select an image smaller than 5MB")
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
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setValue("latitude", lat)
    setValue("longitude", lng)
    setValue("address", address)
    setShowLocationPicker(false)
  }

  const onSubmit = async (data: ReportIssueForm) => {
    setIsSubmitting(true)
    try {
      // Get auth token
      const token = localStorage.getItem("auth-token")
      if (!token) {
        alert("Please login to report an issue")
        return
      }

      // Prepare the API data
      const apiData = {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: "MEDIUM", // Default priority
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        address: data.address,
        image_url: imagePreview && imagePreview.length > 100000 ? undefined : imagePreview, // Skip very large images
      }

      // Submit to API
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit issue")
      }

      const result = await response.json()
      console.log("Issue submitted successfully:", result)
      
      // Show success message
      alert("Issue reported successfully!")
      
      // Reset form or redirect
      window.location.href = "/"
    } catch (error) {
      console.error("Error submitting issue:", error)
      alert(error instanceof Error ? error.message : "Failed to submit issue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Report an Issue"
          description="Help improve your community by reporting civic issues"
          icon={Send}
        >
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </PageHeader>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="font-heading">Issue Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Issue Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief, descriptive title of the issue"
                      {...register("title")}
                      className={errors.title ? "border-red-500" : ""}
                    />
                    {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => setValue("category", value as IssueCategory)}>
                      <SelectTrigger className={errors.category ? "border-red-500" : ""}>
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

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed information about the issue, including any relevant context or urgency"
                      rows={4}
                      {...register("description")}
                      className={errors.description ? "border-red-500" : ""}
                    />
                    {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Location *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        placeholder="Enter address or location"
                        {...register("address")}
                        className={`flex-1 ${errors.address ? "border-red-500" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLocationPicker(true)}
                        className="shrink-0"
                      >
                        Pick on Map
                      </Button>
                    </div>
                    {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image">Photo (Optional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded-lg object-cover"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedImage(null)
                              setImagePreview(null)
                            }}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div className="text-sm text-gray-600">
                            <label htmlFor="image-upload" className="cursor-pointer text-blue-600 hover:text-blue-500">
                              Upload a photo
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                          </div>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
            <div className="space-y-6">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="font-heading">Reporting Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
            <div className="bg-white rounded-lg w-full max-w-4xl h-[600px] flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-heading text-lg">Select Location</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowLocationPicker(false)}>
                  ✕
                </Button>
              </div>
              <div className="flex-1">
                {/* Location Picker Component */}
                <LocationPicker onLocationSelect={handleLocationSelect} initialAddress={currentAddress} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
