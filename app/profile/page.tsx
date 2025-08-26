"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Award, TrendingUp, MapPin, Settings, Calendar, Eye } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { IssueCard } from "@/components/ui/issue-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/badge-status"
import { CategoryBadge } from "@/components/ui/badge-category"
import { PriorityIndicator } from "@/components/ui/priority-indicator"
import { BADGES } from "@/lib/constants"
import { useAuth } from "@/hooks/use-auth"
import { formatDistanceToNow } from "date-fns"
import { convertToIST } from "@/lib/date-utils"
import type { Issue } from "@/lib/types"

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [userIssues, setUserIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    totalVotes: 0,
    totalComments: 0
  })

  useEffect(() => {
    const fetchUserIssues = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        // Fetch all issues and filter by current user
        const response = await fetch('/api/issues')
        
        if (!response.ok) {
          throw new Error('Failed to fetch issues')
        }
        
        const data = await response.json()
        const allIssues = data.issues || []
        
        // Filter issues reported by current user
        const myIssues = allIssues.filter((issue: Issue) => issue.reporterId === user.id)
        setUserIssues(myIssues)
        
        // Calculate stats
        const resolvedCount = myIssues.filter((issue: Issue) => issue.status === "RESOLVED").length
        const totalVotes = myIssues.reduce((sum: number, issue: Issue) => sum + (issue.votes_count || 0), 0)
        const totalComments = myIssues.reduce((sum: number, issue: Issue) => sum + (issue.comments_count || 0), 0)
        
        setStats({
          totalIssues: myIssues.length,
          resolvedIssues: resolvedCount,
          totalVotes,
          totalComments
        })
        
      } catch (error) {
        console.error('Error fetching user issues:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      fetchUserIssues()
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load user profile.</p>
        </div>
      </div>
    )
  }

  const resolvedIssues = stats.resolvedIssues
  const totalVotes = stats.totalVotes

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="My Profile" description="View your civic engagement activity and achievements" icon={User}>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Edit Profile
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Card */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold font-heading text-gray-900 mb-1">{user.name}</h2>
                    <p className="text-gray-600 mb-2">{user.email}</p>
                    <Badge variant="secondary" className="mb-4">
                      {user.role}
                    </Badge>

                    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-blue-600">
                      <Award className="h-5 w-5" />
                      {user.points} Points
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.badges && user.badges.length > 0 ? (
                      user.badges.map((badgeKey: string) => {
                        const badge = BADGES[badgeKey as keyof typeof BADGES]
                        if (!badge) return null
                        return (
                          <motion.div
                            key={badgeKey}
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Award className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{badge.name}</p>
                              <p className="text-sm text-gray-600">{badge.description}</p>
                            </div>
                          </motion.div>
                        )
                      })
                    ) : (
                      <div className="text-center py-4">
                        <Award className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No badges earned yet</p>
                        <p className="text-xs text-gray-400">Keep reporting issues to earn badges!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Overview */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <StatsCard
                title="Issues Reported"
                value={stats.totalIssues}
                description="Total reports submitted"
                icon={MapPin}
                color="#3b82f6"
              />
              <StatsCard
                title="Issues Resolved"
                value={stats.resolvedIssues}
                description="Successfully completed"
                icon={TrendingUp}
                color="#10b981"
              />
              <StatsCard
                title="Community Votes"
                value={stats.totalVotes}
                description="Received on your reports"
                icon={Award}
                color="#f59e0b"
              />
              <StatsCard
                title="Total Comments"
                value={stats.totalComments}
                description="Community discussions"
                icon={Calendar}
                color="#8b5cf6"
              />
            </motion.div>

            {/* My Issues Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    My Submitted Issues ({userIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No issues reported yet.</p>
                      <p className="text-sm text-gray-400">Start by reporting an issue in your community!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Issue</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Engagement</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userIssues.map((issue) => (
                            <TableRow key={issue.id} className="hover:bg-gray-50/50">
                              <TableCell>
                                <div className="max-w-xs">
                                  <p className="font-medium text-gray-900 line-clamp-1">{issue.title}</p>
                                  <p className="text-sm text-gray-600 line-clamp-1">{issue.address}</p>
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
                                  {formatDistanceToNow(convertToIST(issue.createdAt), { addSuffix: true })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.location.href = `/issues/${issue.id}`}
                                  className="gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
