"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Filter, Download, Edit, Eye, MoreHorizontal, AlertCircle, Clock, CheckCircle, Trash2, Bot } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/badge-status"
import { CategoryBadge } from "@/components/ui/badge-category"
import { PriorityIndicator } from "@/components/ui/priority-indicator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatTimeAgo } from "@/lib/date-utils"
import AIAnalysisModal from "@/components/admin/ai-analysis-modal"
import type { Issue, IssueStatus, IssueCategory } from "@/lib/types"

export default function AdminIssuesPage() {
  const router = useRouter()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [aiAnalysisModal, setAiAnalysisModal] = useState<{
    isOpen: boolean
    issue?: Issue
  }>({ isOpen: false })

  // Calculate dynamic status counts
  const statusCounts = {
    all: issues.length,
    PENDING: issues.filter((i) => i.status === "PENDING").length,
    IN_PROGRESS: issues.filter((i) => i.status === "IN_PROGRESS").length,
    RESOLVED: issues.filter((i) => i.status === "RESOLVED").length,
  }

  const statusTabs = [
    { id: "all", label: "All Issues", count: statusCounts.all },
    { id: "PENDING", label: "Pending", count: statusCounts.PENDING },
    { id: "IN_PROGRESS", label: "In Progress", count: statusCounts.IN_PROGRESS },
    { id: "RESOLVED", label: "Resolved", count: statusCounts.RESOLVED },
  ]

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/issues')

        if (!response.ok) {
          throw new Error('Failed to fetch issues')
        }

        const data = await response.json()
        setIssues(data.issues || [])
      } catch (error) {
        console.error('Error fetching issues:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [])

  const refreshIssues = async () => {
    try {
      const response = await fetch('/api/issues')

      if (!response.ok) {
        throw new Error('Failed to fetch issues')
      }

      const data = await response.json()
      setIssues(data.issues || [])
    } catch (error) {
      console.error('Error refreshing issues:', error)
    }
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = activeTab === "all" || issue.status === activeTab
    const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.reporter.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesCategory && matchesSearch
  })

  const handleStatusUpdate = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include httpOnly cookies
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update issue status')
      }

      // Refresh issues from server to get updated counts
      await refreshIssues()
    } catch (error) {
      console.error('Error updating issue status:', error)
      alert('Failed to update issue status')
    }
  }

  const handleViewDetails = (issueId: string) => {
    router.push(`/issues/${issueId}`)
  }

  const handleEditIssue = (issueId: string) => {
    // For now, navigate to view page - you can create an edit page later
    router.push(`/issues/${issueId}`)
  }

  const handleDeleteIssue = async (issueId: string, issueTitle: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the issue "${issueTitle}"?\n\n` +
      `This will permanently delete:\n` +
      `• The issue and all its details\n` +
      `• All comments on this issue\n` +
      `• All votes on this issue\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
        credentials: 'same-origin', // Include httpOnly cookies
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete issue')
      }

      // Show success message
      alert('Issue deleted successfully')

      // Refresh the issues list
      await refreshIssues()
    } catch (error) {
      console.error('Error deleting issue:', error)
      alert(`Failed to delete issue: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAIAnalysis = (issue: Issue) => {
    setAiAnalysisModal({ isOpen: true, issue })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Issue Management"
          description="Monitor, assign, and resolve community-reported issues"
          icon={AlertCircle}
        >
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-white/80">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </Button>
            <Button variant="outline" className="gap-2 bg-white/80">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </PageHeader>

        {/* Filters and Search */}
        <motion.div
          className="space-y-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search issues, addresses, or reporters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200/50"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-white/80">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ROADS">Roads</SelectItem>
                <SelectItem value="LIGHTING">Lighting</SelectItem>
                <SelectItem value="SANITATION">Sanitation</SelectItem>
                <SelectItem value="PARKS">Parks</SelectItem>
                <SelectItem value="UTILITIES">Utilities</SelectItem>
                <SelectItem value="SAFETY">Safety</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FilterTabs tabs={statusTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        {/* Issues Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Issues ({filteredIssues.length})</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {issues.filter((i) => i.status === "PENDING").length} Pending
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {issues.filter((i) => i.status === "IN_PROGRESS").length} In Progress
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {issues.filter((i) => i.status === "RESOLVED").length} Resolved
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading issues..." />
                </div>
              ) : filteredIssues.length === 0 ? (
                <EmptyState
                  icon={AlertCircle}
                  title="No issues found"
                  description="No issues match your current filters. Try adjusting your search criteria."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Engagement</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue, index) => (
                        <motion.tr
                          key={issue.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-gray-50/50"
                        >
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="font-medium text-gray-900 line-clamp-1">{issue.title}</p>
                              <p className="text-sm text-gray-600 line-clamp-1">{issue.address}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{issue.reporter.name}</p>
                              <p className="text-sm text-gray-600">{issue.reporter.points} points</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={issue.category} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={issue.status} />
                          </TableCell>
                          <TableCell>
                            <PriorityIndicator priority={issue.priority} variant="icon" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="flex items-center gap-1">👍 {issue.votes_count || 0}</span>
                              <span className="flex items-center gap-1">💬 {issue.comments_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatTimeAgo(issue.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(issue.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditIssue(issue.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Issue
                                </DropdownMenuItem>
                                {issue.imageUrl && (
                                  <DropdownMenuItem onClick={() => handleAIAnalysis(issue)}>
                                    <Bot className="h-4 w-4 mr-2" />
                                    AI Analysis
                                  </DropdownMenuItem>
                                )}

                                {issue.status === "PENDING" && (<DropdownMenuItem
                                  onClick={() => handleStatusUpdate(issue.id, "IN_PROGRESS")}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark In Progress
                                </DropdownMenuItem>)}
                                {issue.status === "IN_PROGRESS" && <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(issue.id, "RESOLVED")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Resolved
                                </DropdownMenuItem>}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteIssue(issue.id, issue.title)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Issue
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={aiAnalysisModal.isOpen}
        onClose={() => setAiAnalysisModal({ isOpen: false })}
        imageUrl={aiAnalysisModal.issue?.imageUrl}
        issueId={aiAnalysisModal.issue?.id}
      />
    </div>
  )
}
