import type { NextRequest } from "next/server"
import { NextResponse } from 'next/server'
import { Database } from "@/lib/database"
import { PerformanceMonitor } from "@/lib/performance"
import { getAuthUser } from '@/lib/auth-utils'
import { UserModel } from '@/lib/models'
import { withServerCache, SERVER_CACHE_TTL } from '@/lib/server-cache'

// GET /api/users - Get users with their statistics for admin dashboard
export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/users')
  
  try {
    const data = await withServerCache(
      'users:all-with-stats',
      async () => {
        // Get users with their statistics using subqueries to avoid GROUP BY issues
        const users = await Database.query(`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.points,
            u.created_at as createdAt,
            u.updated_at as updatedAt,
            COALESCE(issue_stats.issueCount, 0) as issueCount,
            COALESCE(issue_stats.resolvedCount, 0) as resolvedCount,
            COALESCE(vote_stats.totalVotes, 0) as totalVotes
          FROM users u
          LEFT JOIN (
            SELECT 
              reporter_id,
              COUNT(*) as issueCount,
              COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolvedCount
            FROM issues 
            GROUP BY reporter_id
          ) issue_stats ON u.id = issue_stats.reporter_id
          LEFT JOIN (
            SELECT 
              i.reporter_id,
              COUNT(v.id) as totalVotes
            FROM issues i
            LEFT JOIN votes v ON i.id = v.issue_id
            GROUP BY i.reporter_id
          ) vote_stats ON u.id = vote_stats.reporter_id
          ORDER BY u.points DESC, u.created_at DESC
        `)

        // Parse user data and generate badges based on activity
        const usersWithStats = users.map((user: any, index: number) => {
          const issueCount = parseInt(user.issueCount) || 0
          const resolvedCount = parseInt(user.resolvedCount) || 0
          const points = user.points || 0
          
          // Generate badges based on activity
          let badges = []
          if (issueCount > 0) badges.push('FIRST_REPORT')
          if (issueCount >= 5) badges.push('COMMUNITY_HELPER')
          if (issueCount >= 10) badges.push('CIVIC_CHAMPION')
          if (resolvedCount >= 5) badges.push('PROBLEM_SOLVER')
          if (points >= 100) badges.push('ENGAGEMENT_STAR')
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            points: points,
            badges: badges,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            issueCount: issueCount,
            resolvedCount: resolvedCount,
            totalVotes: parseInt(user.totalVotes) || 0,
            rank: index + 1
          }
        })

        // Calculate summary statistics
        const totalUsers = usersWithStats.length
        const activeUsers = usersWithStats.filter(user => user.issueCount > 0).length
        const avgPoints = totalUsers > 0 ? Math.round(usersWithStats.reduce((sum, user) => sum + user.points, 0) / totalUsers) : 0
        const totalIssues = usersWithStats.reduce((sum, user) => sum + user.issueCount, 0)

        return {
          users: usersWithStats,
          stats: {
            totalUsers,
            activeUsers,
            avgPoints,
            totalIssues
          }
        }
      },
      SERVER_CACHE_TTL.MEDIUM // 5 minutes cache
    )

    endTimer()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching users:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    endTimer()
    return Response.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
