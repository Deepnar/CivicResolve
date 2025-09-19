"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Filter, Download, Eye, MapPin, Calendar, User, Camera, CheckCircle, Bot } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ResolveIssueModal } from "@/components/organization/resolve-issue-modal"
import AIAnalysisModal from "@/components/admin/ai-analysis-modal"
import { useAuth } from "@/hooks/use-auth"
import { formatTimeAgo } from "@/lib/date-utils"
import Link from "next/link"

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
  image_url?: string  // Database field for issue image
  citizen_name: string
  citizen_email: string
  assigned_to?: string
  assigned_to_name?: string
  votes: number
  resolutionImageUrl?: string
}

export default function OrganizationIssues() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [isOrganizationMember, setIsOrganizationMember] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([])
  const [assigningIssueId, setAssigningIssueId] = useState<number | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [selectedIssueForResolve, setSelectedIssueForResolve] = useState<Issue | null>(null)
  const [aiAnalysisModal, setAiAnalysisModal] = useState<{
    isOpen: boolean
    issue?: Issue
  }>({ isOpen: false })

  useEffect(() => {
    checkOrganizationMembership()
  }, [user])

  useEffect(() => {
    if (isOrganizationMember) {
      fetchOrganizationIssues()
    }
  }, [isOrganizationMember])

  const checkOrganizationMembership = async () => {
    if (!user) {
      setCheckingAccess(false)
      return
    }
    
    try {
      setCheckingAccess(true)
      const response = await fetch('/api/user/organization-status', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setIsOrganizationMember(data.isOrganizationMember || user.role === 'ORGANIZATION_ADMIN')
      }
    } catch (error) {
      console.error('Error checking organization membership:', error)
    } finally {
      setCheckingAccess(false)
    }
  }

  useEffect(() => {
    filterIssues()
  }, [issues, searchTerm, statusFilter, categoryFilter, priorityFilter])

  const fetchOrganizationIssues = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/organization/issues', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization issues')
      }
      
      const data = await response.json()
      setIssues(data.issues || [])
      
    } catch (error) {
      console.error('Error fetching organization issues:', error)
      // Fallback to empty array if API fails
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

  const fetchOrganizationMembers = async () => {
    try {
      const response = await fetch('/api/organization/members', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setOrganizationMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching organization members:', error)
    }
  }

  const handleAssignIssue = async (issueId: number, memberId: string, memberName: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}/assign-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedToId: memberId, assignedToName: memberName }),
      })

      if (response.ok) {
        // Refresh the issues list
        fetchOrganizationIssues()
        setAssigningIssueId(null)
        alert(`Issue assigned to ${memberName}`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign issue')
      }
    } catch (error) {
      console.error('Error assigning issue:', error)
      alert(`Failed to assign issue: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  // Fetch organization members when component mounts and user is confirmed as member
  useEffect(() => {
    if (isOrganizationMember) {
      fetchOrganizationMembers()
    }
  }, [isOrganizationMember])

  const handleResolveWithPhoto = (issue: Issue) => {
    setSelectedIssueForResolve(issue)
    setResolveModalOpen(true)
  }

  const handleResolveIssue = async (imageUrl: string) => {
    if (!selectedIssueForResolve) return

    try {
      const response = await fetch(`/api/issues/${selectedIssueForResolve.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resolutionImageUrl: imageUrl }),
      })

      if (response.ok) {
        // Refresh the issues list
        fetchOrganizationIssues()
        alert('Issue resolved successfully with photo proof!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resolve issue')
      }
    } catch (error) {
      console.error('Error resolving issue:', error)
      throw error // Re-throw to let modal handle the error
    }
  }

  const handleAIAnalysis = (issue: Issue) => {
    setAiAnalysisModal({ isOpen: true, issue })
  }

  // Show loading spinner while checking authentication or access
  if (checkingAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Checking access..." />
        </div>
      </div>
    )
  }

  // Show access denied only after the check is complete
  if (!user || !isOrganizationMember) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You must be an organization member to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Organization Issues"
          description="Manage issues assigned to your organization"
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
        title="Organization Issues"
        description={`Managing ${filteredIssues.length} issues in your organization's categories`}
      />

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
                          {issue.citizen_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimeAgo(issue.created_at)}
                        </span>
                        <span>👍 {issue.votes} votes</span>
                        {issue.assigned_to && (
                          <span className="text-blue-600">
                            Assigned to: {issue.assigned_to_name || issue.assigned_to}
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
                      
                      {/* Temporary: Show for all organization members to debug */}
                      {((issue.images && issue.images.length > 0) || issue.image_url) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAIAnalysis(issue)}
                          className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Bot className="h-3 w-3" />
                          AI Analysis
                        </Button>
                      )}
                      
                      {issue.status === 'PENDING' && !issue.assigned_to && user?.role === 'ORGANIZATION_ADMIN' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Assign
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {organizationMembers.length > 0 ? (
                              organizationMembers.map((member) => (
                                <DropdownMenuItem
                                  key={member.id}
                                  onClick={() => handleAssignIssue(issue.id, member.id, member.name)}
                                >
                                  {member.name} ({member.position || 'Member'})
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>
                                No members available
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {issue.status === 'IN_PROGRESS' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleResolveWithPhoto(issue)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Camera className="h-3 w-3" />
                          Resolve with Photo
                        </Button>
                      )}

                      {issue.status === 'RESOLVED' && issue.resolutionImageUrl && (
                        <Button variant="outline" size="sm" className="flex items-center gap-1" disabled>
                          <CheckCircle className="h-3 w-3" />
                          Resolved
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
                : "There are no issues in your organization's categories yet."
              }
            </p>
            {!searchTerm && statusFilter === "all" && categoryFilter === "all" && priorityFilter === "all" && (
              <Link href="/map">
                <Button>View All Issues on Map</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resolve Issue Modal */}
      {selectedIssueForResolve && (
        <ResolveIssueModal
          isOpen={resolveModalOpen}
          onClose={() => {
            setResolveModalOpen(false)
            setSelectedIssueForResolve(null)
          }}
          onResolve={handleResolveIssue}
          issueTitle={selectedIssueForResolve.title}
          issueId={selectedIssueForResolve.id}
        />
      )}

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={aiAnalysisModal.isOpen}
        onClose={() => setAiAnalysisModal({ isOpen: false })}
        imageUrl={aiAnalysisModal.issue?.image_url || (aiAnalysisModal.issue?.images && aiAnalysisModal.issue.images[0])}
        issueId={aiAnalysisModal.issue?.id.toString()}
      />
    </div>
  )
}
