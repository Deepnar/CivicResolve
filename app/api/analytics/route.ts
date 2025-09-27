import type { NextRequest } from "next/server"
import { Database } from "@/lib/db"
import { PerformanceMonitor } from "@/lib/performance"
import { withServerCache, SERVER_CACHE_TTL } from "@/lib/server-cache"

// TypeScript interfaces for database query results
interface CountResult {
  count: number
}

interface CategoryResult {
  category: string
  count: number
}

interface StatusResult {
  status: string
  count: number
}

interface TopUserResult {
  name: string
  issueCount: number
  points: number
}

interface AvgResolutionResult {
  avgDays: number | null
}

interface TrendResult {
  date: string
  count: number
}

interface IssuesOverTimeResult {
  date: string | null
  pending: number
  inProgress: number
  resolved: number
}

interface TopReporterResult {
  id: number
  name: string
  issueCount: number
  points: number
}

// GET /api/analytics - Get comprehensive analytics for admin dashboard
export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/analytics')
  
  try {
    // Check if this is a cache-busting refresh request
    const { searchParams } = new URL(request.url)
    const isRefresh = searchParams.has('_t')
    const cacheKey = isRefresh ? `analytics:dashboard:${Date.now()}` : 'analytics:dashboard'
    
    if (isRefresh) {
      console.log('🔄 Analytics refresh requested - bypassing cache')
    }
    
    const analytics = await withServerCache(
      cacheKey,
      async () => {
        // Optimized single query for basic statistics - eliminates 7 separate queries
        const basicStats = await Database.queryOne<{
          totalIssues: number
          resolvedIssues: number
          pendingIssues: number
          inProgressIssues: number
          totalUsers: number
          totalVotes: number
          totalComments: number
        }>(`
          SELECT 
            (SELECT COUNT(*) FROM issues) as totalIssues,
            (SELECT COUNT(*) FROM issues WHERE status = 'RESOLVED') as resolvedIssues,
            (SELECT COUNT(*) FROM issues WHERE status = 'PENDING') as pendingIssues,
            (SELECT COUNT(*) FROM issues WHERE status = 'IN_PROGRESS') as inProgressIssues,
            (SELECT COUNT(*) FROM users) as totalUsers,
            (SELECT COUNT(*) FROM votes) as totalVotes,
            (SELECT COUNT(*) FROM comments) as totalComments
        `)

        // Issues by category
        const issuesByCategory = await Database.query<CategoryResult>(`
          SELECT category, COUNT(*) as count 
          FROM issues 
          GROUP BY category 
          ORDER BY count DESC
        `)

        // Issues by status
        const issuesByStatus = await Database.query<StatusResult>(`
          SELECT status, COUNT(*) as count 
          FROM issues 
          GROUP BY status 
          ORDER BY count DESC
        `)

        // Issues over time (last 4 weeks) - MySQL date functions
        const issuesOverTime = await Database.query<IssuesOverTimeResult>(`
          SELECT 
            CASE 
              WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 'This Week'
              WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) THEN 'Last Week'
              WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 21 DAY) THEN '2 Weeks Ago'
              WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) THEN '3 Weeks Ago'
            END as date,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as inProgress,
            COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved
          FROM issues 
          WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
          GROUP BY date
          HAVING date IS NOT NULL
          ORDER BY 
            CASE 
              WHEN date = 'This Week' THEN 1
              WHEN date = 'Last Week' THEN 2
              WHEN date = '2 Weeks Ago' THEN 3
              WHEN date = '3 Weeks Ago' THEN 4
            END
        `)

        // Top reporters (users with most reported issues)
        const topReporters = await Database.query<TopReporterResult>(`
          SELECT 
            u.id,
            u.name,
            COUNT(i.id) as issueCount,
            (COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) * 10 + 
             COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 END) * 5 + 
             COUNT(CASE WHEN i.status = 'PENDING' THEN 1 END) * 2) as points
          FROM users u
          LEFT JOIN issues i ON u.id = i.reporter_id
          GROUP BY u.id, u.name
          HAVING issueCount > 0
          ORDER BY issueCount DESC, points DESC
          LIMIT 5
        `)

        // Calculate average resolution time (simplified - days between created and now for resolved issues)
        const avgResolutionResult = await Database.queryOne<AvgResolutionResult>(`
          SELECT AVG(DATEDIFF(NOW(), created_at)) as avgDays
          FROM issues 
          WHERE status = 'RESOLVED'
        `)
        const avgResolutionTime = avgResolutionResult?.avgDays ? 
          Math.round(avgResolutionResult.avgDays * 10) / 10 : 0

        // Recent issues (last 30 days)
        const recentIssues = await Database.queryOne<CountResult>(`
          SELECT COUNT(*) as count 
          FROM issues 
          WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `)

        // Format the response to match the dashboard expectations
        return {
          overview: {
            totalIssues: basicStats?.totalIssues || 0,
            pendingIssues: basicStats?.pendingIssues || 0,
            inProgressIssues: basicStats?.inProgressIssues || 0,
            resolvedIssues: basicStats?.resolvedIssues || 0,
            totalUsers: basicStats?.totalUsers || 0,
            totalComments: basicStats?.totalComments || 0,
            totalVotes: basicStats?.totalVotes || 0,
            avgResolutionTime
          },
          issuesByCategory: (issuesByCategory || []).map((item: any) => ({
            category: item.category || 'OTHER',
            count: item.count
          })),
          issuesOverTime: issuesOverTime || [],
          topReporters: (topReporters || []).map((reporter: any) => ({
            id: reporter.id,
            name: reporter.name || 'Unknown User',
            issueCount: reporter.issueCount || 0,
            points: reporter.points || 0
          })),
          issuesByStatus: [
            { status: 'PENDING', count: basicStats?.pendingIssues || 0 },
            { status: 'IN_PROGRESS', count: basicStats?.inProgressIssues || 0 },
            { status: 'RESOLVED', count: basicStats?.resolvedIssues || 0 }
          ],
          recentIssues: recentIssues?.count || 0
        }
      },
      SERVER_CACHE_TTL.MEDIUM // 5 minutes cache for dashboard analytics
    )

    endTimer()
    return Response.json({ analytics })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    endTimer()
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
