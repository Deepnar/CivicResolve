"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Building2, Users, AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { formatTimeAgo } from "@/lib/date-utils"
import Link from "next/link"

interface OrganizationStats {
  totalIssues: number
  pendingIssues: number
  inProgressIssues: number
  resolvedIssues: number
  teamMembers: number
  categoriesHandled: string[]
}

interface RecentIssue {
  id: number
  title: string
  category: string
  status: string
  priority: string
  created_at: string
  address: string
}

export default function OrganizationDashboard() {
  const { user, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [organizationName, setOrganizationName] = useState("Organization")
  const [stats, setStats] = useState<{
    totalIssues: number
    pendingIssues: number
    inProgressIssues: number
    resolvedIssues: number
    teamMembers: number
    categoriesHandled: string[]
  }>({
    totalIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    teamMembers: 0,
    categoriesHandled: []
  })
  const [recentIssues, setRecentIssues] = useState<any[]>([])
  const [isOrganizationMember, setIsOrganizationMember] = useState(false)
  const [isOrganizationAdmin, setIsOrganizationAdmin] = useState(false)

  useEffect(() => {
    if (user && (user.role === 'ORGANIZATION_ADMIN' || user.role === 'CITIZEN')) {
      checkOrganizationAccess()
    }
  }, [user])

  const checkOrganizationAccess = async () => {
    try {
      // First check if user has organization access
      const statusResponse = await fetch('/api/user/organization-status', {
        credentials: 'include'
      })
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        if (statusData.isOrganizationMember || user?.role === 'ORGANIZATION_ADMIN') {
          setIsOrganizationMember(true)
          if (user?.role === 'ORGANIZATION_ADMIN') {
            setIsOrganizationAdmin(true)
          }
          fetchDashboardData()
        }
      }
    } catch (error) {
      console.error('Error checking organization access:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/organization/dashboard', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      
      setOrganizationName(data.organizationDetails?.name || "Organization")
      setStats(data.stats)
      setRecentIssues(data.recentIssues || [])
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Fallback to empty data if API fails
      setStats({
        totalIssues: 0,
        pendingIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
        teamMembers: 0,
        categoriesHandled: []
      })
      setRecentIssues([])
    } finally {
      setLoading(false)
    }
  }

  if (!user || (!isOrganizationMember && user.role !== 'ORGANIZATION_ADMIN')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You must be a member of an organization to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Organization Dashboard"
          description="Overview of your organization's activities"
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
        title={`${organizationName} Dashboard`}
        description="Overview of your organization's activities and performance"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIssues}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.pendingIssues}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.inProgressIssues}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.resolvedIssues}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issues */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{issue.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{issue.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{issue.category}</Badge>
                      <Badge 
                        variant={
                          issue.status === 'PENDING' ? 'secondary' :
                          issue.status === 'IN_PROGRESS' ? 'default' : 'outline'
                        }
                      >
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(issue.created_at)}
                      </span>
                    </div>
                  </div>
                  <Link 
                    href={`/issues/${issue.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              {isOrganizationAdmin && (
                <Link 
                  href="/organization/issues"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Issues →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Team Members</label>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{stats?.teamMembers}</span>
                    {isOrganizationAdmin && (
                      <Link 
                        href="/organization/members"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Manage →
                      </Link>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Categories Handled</label>
                  <div className="mt-2 space-y-1">
                    {stats?.categoriesHandled.map((category) => (
                      <Badge key={category} variant="outline" className="mr-1 mb-1">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link 
                  href="/organization/issues"
                  className="block w-full p-3 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                >
                  View All Issues
                </Link>
                {isOrganizationAdmin && (
                  <Link 
                    href="/organization/members"
                    className="block w-full p-3 text-center bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                  >
                    Manage Team
                  </Link>
                )}
                <Link 
                  href="/report"
                  className="block w-full p-3 text-center bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
                >
                  Report New Issue
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
