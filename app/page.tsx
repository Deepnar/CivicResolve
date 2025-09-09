"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, MapPin, TrendingUp, Users, AlertCircle, FileText, CheckCircle, Clock } from "lucide-react"
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
import { useIsMobile, useReducedMotion } from "@/hooks/use-mobile-performance"
import type { Issue, IssueStatus, IssueCategory } from "@/lib/types"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
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

  // Disable animations on mobile or for users who prefer reduced motion
  const shouldAnimate = !isMobile && !prefersReducedMotion

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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <PageHeader
          title="CivicResolve"
          description="Report and track civic issues in your community"
          icon={AlertCircle}
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 bg-transparent touch-target" asChild>
              <Link href="/map">
                <MapPin className="h-4 w-4" />
                Map View
              </Link>
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 touch-target" asChild>
              <Link href="/report">
                <Plus className="h-4 w-4" />
                Report Issue
              </Link>
            </Button>
          </div>
        </PageHeader>

      {/* Stats Section */}
      <section className="py-6 sm:py-8 lg:py-12 bg-gray-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              CivicResolve Impact
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Real-time statistics showing our community's progress in resolving civic issues
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatsCard
              title="Total Issues"
              value="247"
              icon={FileText}
              description="Issues reported by citizens"
              trend={{
                value: 12,
                label: "this month",
                isPositive: true,
              }}
              disableAnimations={!shouldAnimate}
            />
            <StatsCard
              title="Resolved Issues"
              value="189"
              icon={CheckCircle}
              description="Successfully resolved"
              trend={{
                value: 8,
                label: "this month",
                isPositive: true,
              }}
              disableAnimations={!shouldAnimate}
            />
            <StatsCard
              title="Active Users"
              value="1,234"
              icon={Users}
              description="Engaged community members"
              trend={{
                value: 15,
                label: "this month",
                isPositive: true,
              }}
              disableAnimations={!shouldAnimate}
            />
            <StatsCard
              title="Response Time"
              value="2.4 hrs"
              icon={Clock}
              description="Average response time"
              trend={{
                value: -20,
                label: "improved",
                isPositive: true,
              }}
              disableAnimations={!shouldAnimate}
            />
          </div>
        </div>
      </section>        {/* Search and Filters */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 sm:p-6 mb-6 sm:mb-8 space-y-4 sm:space-y-6"
          {...(shouldAnimate && {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3, delay: 0.2 }
          })}
        >
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/80 backdrop-blur-sm border-gray-200/50 h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-2">Filter by Status</h3>
              <FilterTabs tabs={statusTabs} activeTab={activeStatusTab} onTabChange={setActiveStatusTab} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-2">Filter by Category</h3>
              <FilterTabs tabs={categoryTabs} activeTab={activeCategoryTab} onTabChange={setActiveCategoryTab} />
            </div>
          </div>
        </motion.div>

        {/* Issues List */}
        <motion.div 
          {...(shouldAnimate && {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.3, delay: 0.3 }
          })}
        >
          {loading ? (
            <div className="flex justify-center py-8 sm:py-12">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredIssues.map((issue, index) => (
                <motion.div
                  key={issue.id}
                  {...(shouldAnimate && {
                    initial: { opacity: 0, y: 20 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.2, delay: Math.min(index * 0.05, 0.3) }
                  })}
                  className="w-full"
                >
                  <IssueCard 
                    issue={issue} 
                    onClick={() => (window.location.href = `/issues/${issue.id}`)}
                    disableAnimations={!shouldAnimate}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
