"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, MapPin, TrendingUp, Users, AlertCircle } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { IssueCard } from "@/components/ui/issue-card"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { StatsCard } from "@/components/ui/stats-card"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navigation/navbar"
import { useAuth } from "@/hooks/use-auth"
import type { Issue, IssueStatus, IssueCategory } from "@/lib/types"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatusTab, setActiveStatusTab] = useState("all")
  const [activeCategoryTab, setActiveCategoryTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    totalVotes: 0,
    totalComments: 0
  })

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/issues')
        
        if (!response.ok) {
          throw new Error('Failed to fetch issues')
        }
        
        const data = await response.json()
        const fetchedIssues = data.issues || []
        setIssues(fetchedIssues)
        
        // Calculate dynamic stats
        const totalIssues = fetchedIssues.length
        const resolvedIssues = fetchedIssues.filter((issue: Issue) => issue.status === "RESOLVED").length
        const pendingIssues = fetchedIssues.filter((issue: Issue) => issue.status === "PENDING").length
        const inProgressIssues = fetchedIssues.filter((issue: Issue) => issue.status === "IN_PROGRESS").length
        const totalVotes = fetchedIssues.reduce((sum: number, issue: Issue) => sum + (issue.votes_count || 0), 0)
        const totalComments = fetchedIssues.reduce((sum: number, issue: Issue) => sum + (issue.comments_count || 0), 0)
        
        setStats({
          totalIssues,
          resolvedIssues,
          pendingIssues,
          inProgressIssues,
          totalVotes,
          totalComments
        })
      } catch (error) {
        console.error('Error fetching issues:', error)
        setIssues([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [])

  // Create dynamic tabs with counts
  const statusTabs = [
    { id: "all", label: "All Issues", count: stats.totalIssues },
    { id: "PENDING", label: "Pending", count: stats.pendingIssues },
    { id: "IN_PROGRESS", label: "In Progress", count: stats.inProgressIssues },
    { id: "RESOLVED", label: "Resolved", count: stats.resolvedIssues },
  ]

  // Calculate category counts
  const categoryCounts = {
    all: issues.length,
    ROADS: issues.filter(issue => issue.category === "ROADS").length,
    LIGHTING: issues.filter(issue => issue.category === "LIGHTING").length,
    SANITATION: issues.filter(issue => issue.category === "SANITATION").length,
    PARKS: issues.filter(issue => issue.category === "PARKS").length,
    UTILITIES: issues.filter(issue => issue.category === "UTILITIES").length,
    SAFETY: issues.filter(issue => issue.category === "SAFETY").length,
  }

  const categoryTabs = [
    { id: "all", label: "All Categories", count: categoryCounts.all },
    { id: "ROADS", label: "Roads", count: categoryCounts.ROADS },
    { id: "LIGHTING", label: "Lighting", count: categoryCounts.LIGHTING },
    { id: "SANITATION", label: "Sanitation", count: categoryCounts.SANITATION },
    { id: "PARKS", label: "Parks", count: categoryCounts.PARKS },
    { id: "UTILITIES", label: "Utilities", count: categoryCounts.UTILITIES },
    { id: "SAFETY", label: "Safety", count: categoryCounts.SAFETY },
  ]

  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = activeStatusTab === "all" || issue.status === activeStatusTab
    const matchesCategory = activeCategoryTab === "all" || issue.category === activeCategoryTab
    const matchesSearch =
      searchQuery === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesCategory && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold mb-4">Welcome to CivicResolve</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the dashboard</p>
          <div className="space-x-4">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="CivicResolve"
          description="Report and track civic issues in your community"
          icon={AlertCircle}
        >
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-transparent" asChild>
              <Link href="/map">
                <MapPin className="h-4 w-4" />
                Map View
              </Link>
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/report">
                <Plus className="h-4 w-4" />
                Report Issue
              </Link>
            </Button>
          </div>
        </PageHeader>

        {/* Stats Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <StatsCard
            title="Total Issues"
            value={stats.totalIssues.toString()}
            description="Issues reported"
            icon={AlertCircle}
            trend={{ 
              value: stats.totalVotes, 
              label: "community votes", 
              isPositive: true 
            }}
            color="#3b82f6"
          />
          <StatsCard
            title="Resolved Issues"
            value={stats.resolvedIssues.toString()}
            description="Successfully completed"
            icon={TrendingUp}
            trend={{ 
              value: stats.resolvedIssues > 0 ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100) : 0, 
              label: "resolution rate", 
              isPositive: true 
            }}
            color="#10b981"
          />
          <StatsCard
            title="Community Engagement"
            value={stats.totalComments.toString()}
            description="Comments & discussions"
            icon={Users}
            trend={{ 
              value: stats.pendingIssues, 
              label: "pending issues", 
              isPositive: false 
            }}
            color="#f59e0b"
          />
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="space-y-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/80 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Status</h3>
              <FilterTabs tabs={statusTabs} activeTab={activeStatusTab} onTabChange={setActiveStatusTab} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Category</h3>
              <FilterTabs tabs={categoryTabs} activeTab={activeCategoryTab} onTabChange={setActiveCategoryTab} />
            </div>
          </div>
        </motion.div>

        {/* Issues List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading issues..." />
            </div>
          ) : filteredIssues.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No issues found"
              description="No issues match your current filters. Try adjusting your search criteria or be the first to report an issue in your area."
              action={{
                label: "Report First Issue",
                onClick: () => (window.location.href = "/report"),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredIssues.map((issue, index) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <IssueCard issue={issue} onClick={() => (window.location.href = `/issues/${issue.id}`)} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
