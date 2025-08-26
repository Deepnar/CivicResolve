import type { NextRequest } from "next/server"
import { Database } from "@/lib/db"

// GET /api/analytics - Get basic analytics
export async function GET(request: NextRequest) {
  try {
    // Get basic statistics
    const totalIssues = await Database.queryOne("SELECT COUNT(*) as count FROM issues")
    const resolvedIssues = await Database.queryOne("SELECT COUNT(*) as count FROM issues WHERE status = 'RESOLVED'")
    const pendingIssues = await Database.queryOne("SELECT COUNT(*) as count FROM issues WHERE status = 'PENDING'")
    const inProgressIssues = await Database.queryOne("SELECT COUNT(*) as count FROM issues WHERE status = 'IN_PROGRESS'")
    const totalUsers = await Database.queryOne("SELECT COUNT(*) as count FROM users")
    const totalVotes = await Database.queryOne("SELECT COUNT(*) as count FROM votes")

    // Issues by category
    const issuesByCategory = await Database.query(`
      SELECT category, COUNT(*) as count 
      FROM issues 
      GROUP BY category 
      ORDER BY count DESC
    `)

    // Issues by status
    const issuesByStatus = await Database.query(`
      SELECT status, COUNT(*) as count 
      FROM issues 
      GROUP BY status 
      ORDER BY count DESC
    `)

    // Recent issues (last 30 days)
    const recentIssues = await Database.queryOne(`
      SELECT COUNT(*) as count 
      FROM issues 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `)

    return Response.json({
      totalIssues: totalIssues?.count || 0,
      resolvedIssues: resolvedIssues?.count || 0,
      pendingIssues: pendingIssues?.count || 0,
      inProgressIssues: inProgressIssues?.count || 0,
      totalUsers: totalUsers?.count || 0,
      totalVotes: totalVotes?.count || 0,
      recentIssues: recentIssues?.count || 0,
      issuesByCategory,
      issuesByStatus,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
