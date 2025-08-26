"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Award, TrendingUp, Search, Download, MoreHorizontal, Crown, Star } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import type { User } from "@/lib/types"
import { BADGES } from "@/lib/constants"

interface UserWithStats extends User {
  issueCount: number
  resolvedCount: number
  totalVotes: number
  rank: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers: UserWithStats[] = [
      {
        id: "1",
        name: "John Doe",
        email: "john.doe@email.com",
        role: "CITIZEN",
        points: 450,
        badges: ["FIRST_REPORT", "COMMUNITY_HELPER", "CIVIC_CHAMPION"],
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        issueCount: 23,
        resolvedCount: 18,
        totalVotes: 67,
        rank: 1,
      },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane.smith@email.com",
        role: "CITIZEN",
        points: 380,
        badges: ["FIRST_REPORT", "COMMUNITY_HELPER", "ENGAGEMENT_STAR"],
        createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        issueCount: 19,
        resolvedCount: 15,
        totalVotes: 52,
        rank: 2,
      },
      {
        id: "3",
        name: "Mike Wilson",
        email: "mike.wilson@email.com",
        role: "CITIZEN",
        points: 320,
        badges: ["FIRST_REPORT", "COMMUNITY_HELPER"],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        issueCount: 16,
        resolvedCount: 12,
        totalVotes: 43,
        rank: 3,
      },
      {
        id: "4",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        role: "CITIZEN",
        points: 290,
        badges: ["FIRST_REPORT", "ENGAGEMENT_STAR"],
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        issueCount: 14,
        resolvedCount: 10,
        totalVotes: 38,
        rank: 4,
      },
      {
        id: "5",
        name: "David Brown",
        email: "david.brown@email.com",
        role: "CITIZEN",
        points: 250,
        badges: ["FIRST_REPORT", "PROBLEM_SOLVER"],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        issueCount: 12,
        resolvedCount: 9,
        totalVotes: 31,
        rank: 5,
      },
    ]

    setTimeout(() => {
      setUsers(mockUsers)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalUsers = users.length
  const activeUsers = users.filter((user) => user.issueCount > 0).length
  const avgPoints = Math.round(users.reduce((sum, user) => sum + user.points, 0) / users.length)
  const totalIssues = users.reduce((sum, user) => sum + user.issueCount, 0)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Award className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <Star className="h-4 w-4 text-gray-300" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="User Management" description="Monitor community engagement and user activity" icon={Users}>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-white/80">
              <Download className="h-4 w-4" />
              Export Users
            </Button>
          </div>
        </PageHeader>

        {/* User Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatsCard
            title="Total Users"
            value={totalUsers.toLocaleString()}
            description="Registered citizens"
            icon={Users}
            color="#3b82f6"
          />
          <StatsCard
            title="Active Contributors"
            value={activeUsers}
            description="Users with reports"
            icon={TrendingUp}
            color="#10b981"
          />
          <StatsCard
            title="Average Points"
            value={avgPoints}
            description="Per active user"
            icon={Award}
            color="#f59e0b"
          />
          <StatsCard
            title="Total Reports"
            value={totalIssues}
            description="Community submissions"
            icon={TrendingUp}
            color="#8b5cf6"
          />
        </motion.div>

        {/* Search */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200/50"
            />
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Community Leaderboard ({filteredUsers.length})</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Ranked by Points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading users..." />
                </div>
              ) : filteredUsers.length === 0 ? (
                <EmptyState icon={Users} title="No users found" description="No users match your search criteria." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Resolved</TableHead>
                        <TableHead>Votes Received</TableHead>
                        <TableHead>Badges</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-gray-50/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRankIcon(user.rank)}
                              <span className="font-semibold text-gray-900">#{user.rank}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-blue-600">{user.points}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{user.issueCount}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-600">{user.resolvedCount}</span>
                              <span className="text-sm text-gray-500">
                                ({Math.round((user.resolvedCount / user.issueCount) * 100) || 0}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{user.totalVotes}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.badges.slice(0, 2).map((badgeKey) => {
                                const badge = BADGES[badgeKey as keyof typeof BADGES]
                                return (
                                  <Badge key={badgeKey} variant="secondary" className="text-xs">
                                    {badge.name.split(" ")[0]}
                                  </Badge>
                                )
                              })}
                              {user.badges.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.badges.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
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
                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                <DropdownMenuItem>View Issues</DropdownMenuItem>
                                <DropdownMenuItem>Send Message</DropdownMenuItem>
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
    </div>
  )
}
