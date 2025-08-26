"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Award, TrendingUp, MapPin, Settings } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { IssueCard } from "@/components/ui/issue-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BADGES } from "@/lib/constants"
import type { User as UserType, Issue } from "@/lib/types"

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [userIssues, setUserIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    const mockUser: UserType = {
      id: "current-user",
      name: "John Doe",
      email: "john.doe@email.com",
      role: "CITIZEN",
      points: 350,
      badges: ["FIRST_REPORT", "COMMUNITY_HELPER", "ENGAGEMENT_STAR"],
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      updatedAt: new Date(),
    }

    const mockIssues: Issue[] = [
      {
        id: "1",
        title: "Large pothole on Main Street",
        description: "Significant pothole causing vehicle damage",
        category: "ROADS",
        status: "PENDING",
        priority: "HIGH",
        latitude: 40.7128,
        longitude: -74.006,
        address: "123 Main Street, New York, NY 10001",
        reporterId: "current-user",
        reporter: mockUser,
        comments: [],
        votes: [
          {
            id: "1",
            issueId: "1",
            userId: "user-2",
            user: {
              id: "user-2",
              name: "Jane",
              email: "",
              role: "CITIZEN",
              points: 0,
              badges: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
          {
            id: "2",
            issueId: "1",
            userId: "user-3",
            user: {
              id: "user-3",
              name: "Mike",
              email: "",
              role: "CITIZEN",
              points: 0,
              badges: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
        ],
        assignments: [],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: "2",
        title: "Broken streetlight in Central Park",
        description: "Streetlight has been out for over a week",
        category: "LIGHTING",
        status: "RESOLVED",
        priority: "MEDIUM",
        latitude: 40.7829,
        longitude: -73.9654,
        address: "Central Park Entrance, New York, NY 10024",
        reporterId: "current-user",
        reporter: mockUser,
        comments: [],
        votes: [],
        assignments: [],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    ]

    setTimeout(() => {
      setUser(mockUser)
      setUserIssues(mockIssues)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
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

  const resolvedIssues = userIssues.filter((issue) => issue.status === "RESOLVED").length
  const totalVotes = userIssues.reduce((sum, issue) => sum + issue.votes.length, 0)

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
                    {user.badges.map((badgeKey) => {
                      const badge = BADGES[badgeKey as keyof typeof BADGES]
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
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Overview */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <StatsCard
                title="Issues Reported"
                value={userIssues.length}
                description="Total reports submitted"
                icon={MapPin}
                color="#3b82f6"
              />
              <StatsCard
                title="Issues Resolved"
                value={resolvedIssues}
                description="Successfully completed"
                icon={TrendingUp}
                color="#10b981"
              />
              <StatsCard
                title="Community Votes"
                value={totalVotes}
                description="Received on your reports"
                icon={Award}
                color="#f59e0b"
              />
            </motion.div>

            {/* Recent Issues */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    My Recent Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userIssues.map((issue, index) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <IssueCard
                          issue={issue}
                          showReporter={false}
                          onClick={() => console.log("Navigate to issue", issue.id)}
                        />
                      </motion.div>
                    ))}
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
