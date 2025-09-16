"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Map, Filter, Search, Layers } from "lucide-react"
import dynamic from "next/dynamic"
import { PageHeader } from "@/components/ui/page-header"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Issue, IssueStatus, IssueCategory } from "@/lib/types"

// Load IssueMap component dynamically with SSR disabled
const IssueMap = dynamic(() => import("@/components/maps/issue-map").then(mod => ({ default: mod.IssueMap })), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading map..." />
  </div>
})

const statusTabs = [
  { id: "all", label: "All Issues" },
  { id: "PENDING", label: "Pending" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "RESOLVED", label: "Resolved" },
]

export default function MapPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [activeStatusTab, setActiveStatusTab] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Calculate engagement score for prioritization (same as map component)
  const calculateEngagementScore = (issue: Issue) => {
    const votesCount = issue.votes_count || issue.votes?.length || 0
    const commentsCount = issue.comments_count || issue.comments?.length || 0
    
    // Weight votes and comments (comments are weighted higher as they require more engagement)
    return (votesCount * 1) + (commentsCount * 2)
  }

  // Get priority color based on engagement score (modern color scheme)
  const getPriorityColor = (engagementScore: number, maxScore: number, issueStatus: string) => {
    // If issue is resolved, always show green regardless of engagement
    if (issueStatus?.toUpperCase() === 'RESOLVED') {
      return '#10b981' // Emerald green
    }
    
    if (maxScore === 0 || engagementScore === 0) {
      return '#f1f5f9' // Light slate
    }
    
    const ratio = Math.min(engagementScore / maxScore, 1)
    
    if (ratio <= 0.33) {
      return '#dbeafe' // Light blue
    } else if (ratio <= 0.66) {
      return '#fed7aa' // Light orange  
    } else {
      return '#fecaca' // Light red
    }
  }

  // Fetch issues from API
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
        setIssues([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [])

  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = activeStatusTab === "all" || issue.status === activeStatusTab
    const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesCategory && matchesSearch
  }).sort((a, b) => {
    // Sort by engagement score (highest first)
    const scoreA = calculateEngagementScore(a)
    const scoreB = calculateEngagementScore(b)
    return scoreB - scoreA
  })

  // Get maximum engagement score for color scaling
  const maxEngagementScore = Math.max(...filteredIssues.map(calculateEngagementScore), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading map..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Issues Map" description="Explore civic issues in your community geographically" icon={Map}>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Layers className="h-4 w-4" />
            Map Layers
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <IssueMap
                issues={filteredIssues}
                selectedIssue={selectedIssue}
                onIssueSelect={setSelectedIssue}
                height="600px"
                showControls={true}
                clustered={true}
              />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search issues..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Status filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                    <FilterTabs tabs={statusTabs} activeTab={activeStatusTab} onTabChange={setActiveStatusTab} />
                  </div>

                  {/* Category filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
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

                  {/* Priority Legend */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Priority by Engagement</label>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2" style={{backgroundColor: '#f1f5f9', borderColor: '#cbd5e1'}}></div>
                        <span className="text-slate-600">No Engagement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2" style={{backgroundColor: '#dbeafe', borderColor: '#3b82f6'}}></div>
                        <span className="text-blue-600">Low Priority</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2" style={{backgroundColor: '#fed7aa', borderColor: '#f97316'}}></div>
                        <span className="text-orange-600">Medium Priority</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2" style={{backgroundColor: '#fecaca', borderColor: '#ef4444'}}></div>
                        <span className="text-red-600">🔥 High Priority</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2" style={{backgroundColor: '#10b981', borderColor: '#059669'}}></div>
                        <span className="text-emerald-600">✅ Resolved</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Issue List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle>Issues ({filteredIssues.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredIssues.map((issue, index) => {
                      const engagementScore = calculateEngagementScore(issue)
                      const priorityColor = getPriorityColor(engagementScore, maxEngagementScore, issue.status)
                      const isHighPriority = engagementScore > maxEngagementScore * 0.6 && issue.status?.toUpperCase() !== 'RESOLVED'
                      
                      return (
                        <motion.div
                          key={issue.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`cursor-pointer rounded-lg border-2 transition-all duration-200 relative ${
                            selectedIssue?.id === issue.id
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-transparent hover:border-gray-200 hover:bg-gray-50/50"
                          }`}
                          style={{
                            backgroundColor: selectedIssue?.id === issue.id ? undefined : priorityColor,
                            borderLeftWidth: '4px',
                            borderLeftColor: priorityColor === '#f1f5f9' ? '#cbd5e1' : (
                              priorityColor === '#dbeafe' ? '#3b82f6' : (
                                priorityColor === '#fed7aa' ? '#f97316' : (
                                  priorityColor === '#fecaca' ? '#ef4444' : '#059669'
                                )
                              )
                            )
                          }}
                          onClick={() => setSelectedIssue(issue)}
                        >
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className={`font-medium line-clamp-2 text-sm flex-1 ${
                                selectedIssue?.id === issue.id ? 'text-gray-900' : (
                                  priorityColor === '#f1f5f9' ? 'text-slate-700' : 'text-gray-900'
                                )
                              }`}>{issue.title}</h4>
                              {engagementScore > 0 && (
                                <div className="ml-2 flex items-center gap-1">
                                  <span className="text-xs font-bold text-red-600 bg-white/80 px-1 rounded">🔥 {engagementScore}</span>
                                  {isHighPriority && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className={`text-xs line-clamp-1 mb-2 ${
                              selectedIssue?.id === issue.id ? 'text-gray-600' : (
                                priorityColor === '#f1f5f9' ? 'text-slate-600' : 'text-gray-700'
                              )
                            }`}>{issue.address}</p>
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center gap-2 text-xs ${
                                selectedIssue?.id === issue.id ? 'text-gray-500' : (
                                  priorityColor === '#f1f5f9' ? 'text-slate-500' : 'text-gray-600'
                                )
                              }`}>
                                <span>👍 {issue.votes_count || issue.votes?.length || 0}</span>
                                <span>💬 {issue.comments_count || issue.comments?.length || 0}</span>
                              </div>
                              <div className={`text-xs uppercase font-medium ${
                                selectedIssue?.id === issue.id ? 'text-gray-500' : (
                                  priorityColor === '#f1f5f9' ? 'text-slate-500' : 'text-gray-600'
                                )
                              }`}>{issue.status}</div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
