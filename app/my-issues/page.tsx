"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Eye, MapPin, Calendar, User, CheckCircle, Clock, AlertCircle, Camera, Upload, X } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { formatTimeAgo } from "@/lib/date-utils"
import Link from "next/link"
import { toast } from "sonner"

interface Issue {
  id: number
  title: string
  description: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  address: string
  coordinates: { lat: number; lng: number }
  images: string[]
  citizen_name: string
  citizen_email: string
  assigned_to?: string
  assigned_to_name?: string
  assigned_by_name?: string
  assigned_at?: string
  votes: number
}

export default function MyIssues() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  })
  
  // Photo resolution states
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMyIssues()
    }
  }, [user])

  useEffect(() => {
    filterIssues()
    calculateStats()
  }, [issues, searchTerm, statusFilter, categoryFilter, priorityFilter])

  const fetchMyIssues = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/my-issues', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch my issues')
      }
      
      const data = await response.json()
      setIssues(data.issues || [])
      
    } catch (error) {
      console.error('Error fetching my issues:', error)
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  const filterIssues = () => {
    let filtered = issues

    if (searchTerm) {
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(issue => issue.status === statusFilter)
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(issue => issue.category === categoryFilter)
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(issue => issue.priority === priorityFilter)
    }

    setFilteredIssues(filtered)
  }

  const calculateStats = () => {
    const total = filteredIssues.length
    const pending = filteredIssues.filter(issue => issue.status === 'PENDING').length
    const inProgress = filteredIssues.filter(issue => issue.status === 'IN_PROGRESS').length
    const resolved = filteredIssues.filter(issue => issue.status === 'RESOLVED').length
    
    setStats({ total, pending, inProgress, resolved })
  }

  // Photo handling functions
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Create base64 data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setResolutionPhoto(result)
    }
    reader.readAsDataURL(file)
  }

  const handleResolveWithPhoto = async () => {
    if (!selectedIssueId || !resolutionPhoto) {
      toast.error("Please select a photo before resolving")
      return
    }

    setUploadingPhoto(true)
    try {
      const response = await fetch(`/api/issues/${selectedIssueId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          resolutionImageUrl: resolutionPhoto 
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to resolve issue')
      }

      const result = await response.json()
      toast.success("Issue resolved successfully with photo!")
      
      // Refresh the issues list
      fetchMyIssues()
      
      // Reset modal state
      setShowPhotoModal(false)
      setSelectedIssueId(null)
      setResolutionPhoto(null)
    } catch (error) {
      console.error('Error resolving issue:', error)
      toast.error(error instanceof Error ? error.message : "Failed to resolve issue")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const openPhotoModal = (issueId: number) => {
    setSelectedIssueId(issueId)
    setShowPhotoModal(true)
    setResolutionPhoto(null)
  }

  const closePhotoModal = () => {
    setShowPhotoModal(false)
    setSelectedIssueId(null)
    setResolutionPhoto(null)
  }

  const handleStatusUpdate = async (issueId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update issue status')
      }

      toast.success('Issue status updated successfully')
      fetchMyIssues() // Refresh the list
    } catch (error) {
      console.error('Error updating issue status:', error)
      toast.error('Failed to update issue status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-100 text-orange-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'IN_PROGRESS'
      case 'IN_PROGRESS': return 'RESOLVED'
      case 'RESOLVED': return null
      default: return null
    }
  }

  const getStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'Start Working'
      case 'IN_PROGRESS': return 'Mark Resolved'
      case 'RESOLVED': return 'Completed'
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="My Issues"
          description="Issues assigned to me"
        />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="My Issues"
        description={`${filteredIssues.length} issues assigned to me`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="LIGHTING">Lighting</SelectItem>
                <SelectItem value="PARKS">Parks</SelectItem>
                <SelectItem value="TRAFFIC">Traffic</SelectItem>
                <SelectItem value="WASTE">Waste</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.map((issue) => (
          <Card key={issue.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{issue.title}</h3>
                      <p className="text-gray-600 mb-3">{issue.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getStatusColor(issue.status)}>
                          {issue.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(issue.priority)}>
                          {issue.priority}
                        </Badge>
                        <Badge variant="outline">{issue.category}</Badge>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {issue.address}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Reported by: {issue.citizen_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimeAgo(issue.created_at)}
                        </span>
                        <span>👍 {issue.votes} votes</span>
                        {issue.assigned_by_name && (
                          <span className="text-blue-600">
                            Assigned by: {issue.assigned_by_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/issues/${issue.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                      </Link>
                      
                      {getNextStatus(issue.status) && (
                        <Button 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => {
                            const nextStatus = getNextStatus(issue.status)!
                            if (nextStatus === 'RESOLVED') {
                              openPhotoModal(issue.id)
                            } else {
                              handleStatusUpdate(issue.id, nextStatus)
                            }
                          }}
                        >
                          {getNextStatus(issue.status) === 'RESOLVED' ? (
                            <Camera className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {getStatusAction(issue.status)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" 
                ? "Try adjusting your filters to see more results."
                : "You don't have any issues assigned to you yet."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo Resolution Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Resolution Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePhotoModal}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Please upload a photo showing the completed work to mark this issue as resolved.
            </p>
            
            {!resolutionPhoto ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500">
                    Click to upload a photo
                  </span>
                  <input
                    id="resolution-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum file size: 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={resolutionPhoto}
                    alt="Resolution photo"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setResolutionPhoto(null)}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <Button
                    onClick={handleResolveWithPhoto}
                    disabled={uploadingPhoto}
                    className="flex-1"
                  >
                    {uploadingPhoto ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Resolving...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
