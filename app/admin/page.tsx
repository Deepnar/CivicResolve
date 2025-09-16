"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { AlertCircle, TrendingUp, Users, Clock, CheckCircle, XCircle, Download, Calendar, BarChart3 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ISSUE_CATEGORIES } from "@/lib/constants"
import { formatTimeAgo } from "@/lib/date-utils"

interface AnalyticsData {
  overview: {
    totalIssues: number
    pendingIssues: number
    inProgressIssues: number
    resolvedIssues: number
    totalUsers: number
    totalComments: number
    totalVotes: number
    avgResolutionTime: number
  }
  issuesByCategory: Array<{ category: string; count: number }>
  issuesOverTime: Array<{ date: string; pending: number; inProgress: number; resolved: number }>
  topReporters: Array<{ id: string; name: string; points: number; issueCount: number }>
}

export default function AdminDashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [recentIssues, setRecentIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("30d")

  useEffect(() => {
    fetchAnalytics()
    fetchRecentIssues()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/analytics')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setAnalyticsData(data.analytics)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentIssues = async () => {
    try {
      const response = await fetch('/api/issues?limit=4')
      if (response.ok) {
        const data = await response.json()
        setRecentIssues(data.issues || [])
      }
    } catch (error) {
      console.error('Error fetching recent issues:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h1>
          <p className="text-gray-600">Please try refreshing the page.</p>
        </div>
      </div>
    )
  }

  const categoryChartData = analyticsData.issuesByCategory.map((item) => ({
    name: ISSUE_CATEGORIES[item.category as keyof typeof ISSUE_CATEGORIES]?.label || item.category,
    value: item.count,
    color: ISSUE_CATEGORIES[item.category as keyof typeof ISSUE_CATEGORIES]?.color || "#6b7280",
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Admin Dashboard" description="Municipal management and analytics overview" icon={BarChart3}>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-white/80">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </PageHeader>

        {/* Overview Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatsCard
            title="Total Issues"
            value={analyticsData.overview.totalIssues.toLocaleString()}
            description="All time reports"
            icon={AlertCircle}
            trend={{ value: 12, label: "from last month", isPositive: true }}
            color="#3b82f6"
          />
          <StatsCard
            title="Pending Issues"
            value={analyticsData.overview.pendingIssues.toString()}
            description="Awaiting assignment"
            icon={Clock}
            trend={{ value: -8, label: "from last week", isPositive: true }}
            color="#f59e0b"
          />
          <StatsCard
            title="Resolved Issues"
            value={analyticsData.overview.resolvedIssues.toLocaleString()}
            description="Successfully completed"
            icon={CheckCircle}
            trend={{ value: 15, label: "this month", isPositive: true }}
            color="#10b981"
          />
          <StatsCard
            title="Avg Resolution Time"
            value={`${analyticsData.overview.avgResolutionTime} days`}
            description="Time to completion"
            icon={TrendingUp}
            trend={{ value: -12, label: "improvement", isPositive: true }}
            color="#8b5cf6"
          />
        </motion.div>

        {/* Additional Stats Row */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <StatsCard
            title="Total Users"
            value={analyticsData.overview.totalUsers.toLocaleString()}
            description="Registered citizens"
            icon={Users}
            color="#6366f1"
          />
          <StatsCard
            title="In Progress"
            value={analyticsData.overview.inProgressIssues.toString()}
            description="Currently being worked on"
            icon={Clock}
            color="#3b82f6"
          />
          <StatsCard
            title="Total Votes"
            value={analyticsData.overview.totalVotes.toLocaleString()}
            description="Community engagement"
            icon={TrendingUp}
            color="#f59e0b"
          />
          <StatsCard
            title="Comments"
            value={analyticsData.overview.totalComments.toLocaleString()}
            description="Community feedback"
            icon={AlertCircle}
            color="#10b981"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Issues by Category Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Issues by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Issues Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Issues Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.issuesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                    <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" strokeWidth={2} name="In Progress" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Reporters Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Community Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topReporters.length > 0 ? (
                    analyticsData.topReporters.map((reporter, index) => (
                      <motion.div
                        key={reporter.id}
                        className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{reporter.name}</p>
                            <p className="text-sm text-gray-600">{reporter.issueCount} issues reported</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">{reporter.points} pts</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center p-8 text-gray-500">
                      <p>No reporters data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentIssues.length > 0 ? (
                    recentIssues.map((issue, index) => {
                      let icon = AlertCircle
                      let bgColor = "bg-blue-50/80"
                      let iconColor = "text-blue-600"
                      let actionText = "Issue Reported"

                      if (issue.status === "RESOLVED") {
                        icon = CheckCircle
                        bgColor = "bg-green-50/80"
                        iconColor = "text-green-600"
                        actionText = "Issue Resolved"
                      } else if (issue.status === "IN_PROGRESS") {
                        icon = Clock
                        bgColor = "bg-yellow-50/80"
                        iconColor = "text-yellow-600"
                        actionText = "Issue In Progress"
                      } else if (issue.priority === "URGENT") {
                        icon = XCircle
                        bgColor = "bg-red-50/80"
                        iconColor = "text-red-600"
                        actionText = "Urgent Issue Reported"
                      }

                      const IconComponent = icon

                      return (
                        <div key={issue.id} className={`flex items-start gap-3 p-3 ${bgColor} rounded-lg`}>
                          <IconComponent className={`h-5 w-5 ${iconColor} mt-0.5`} />
                          <div>
                            <p className="font-medium text-gray-900">{actionText}</p>
                            <p className="text-sm text-gray-600">{issue.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {issue.createdAt ? 
                                formatTimeAgo(issue.createdAt) :
                                'No date available'
                              }
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">No Recent Activity</p>
                        <p className="text-sm text-gray-600">No recent issues to display</p>
                        <p className="text-xs text-gray-500 mt-1">Check back later</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
