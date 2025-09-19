"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Camera, Upload, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ResolveIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onResolve: (imageUrl: string) => Promise<void>
  issueTitle: string
  issueId: number
}

export function ResolveIssueModal({ 
  isOpen, 
  onClose, 
  onResolve, 
  issueTitle, 
  issueId 
}: ResolveIssueModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB')
        return
      }

      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string> => {
    if (!selectedFile) {
      throw new Error('No file selected')
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('issueId', issueId.toString())
    formData.append('type', 'resolution')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload image')
    }

    const data = await response.json()
    return data.url
  }

  const handleResolve = async () => {
    if (!selectedFile) {
      alert('Please select a photo of the resolved issue')
      return
    }

    try {
      setIsUploading(true)
      const imageUrl = await uploadImage()
      
      setIsUploading(false)
      setIsResolving(true)
      
      await onResolve(imageUrl)
      
      // Reset form and close modal
      setSelectedFile(null)
      setImagePreview('')
      onClose()
    } catch (error) {
      console.error('Error resolving issue:', error)
      alert(error instanceof Error ? error.message : 'Failed to resolve issue. Please try again.')
    } finally {
      setIsUploading(false)
      setIsResolving(false)
    }
  }

  const handleClose = () => {
    if (isUploading || isResolving) return
    setSelectedFile(null)
    setImagePreview('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Issue</DialogTitle>
          <DialogDescription>
            Upload a photo showing that the issue has been resolved: <strong>{issueTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolution-photo">Resolution Photo</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {imagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={imagePreview} 
                    alt="Resolution preview" 
                    className="max-w-full h-48 object-cover rounded-lg mx-auto"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      setImagePreview('')
                    }}
                    disabled={isUploading || isResolving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <Button variant="outline" asChild>
                      <label htmlFor="resolution-photo" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Photo
                      </label>
                    </Button>
                    <Input
                      id="resolution-photo"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading || isResolving}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Take a photo or select from gallery (max 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isUploading || isResolving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={!selectedFile || isUploading || isResolving}
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : isResolving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Resolving...
                </>
              ) : (
                'Resolve Issue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}