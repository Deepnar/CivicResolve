import { NextResponse } from "next/server"
import { Database } from "@/lib/database"

// TypeScript interfaces for database query results
interface CountResult {
  count: number
}

interface AvgHoursResult {
  avg_hours: number | null
}

export async function GET() {
  try {
    // Get total issues count
    const totalIssuesResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues'
    )
    const totalIssues = totalIssuesResult[0]?.count || 0

    // Get resolved issues count
    const resolvedIssuesResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues WHERE status = ?',
      ['RESOLVED']
    )
    const resolvedIssues = resolvedIssuesResult[0]?.count || 0

    // Get active users count (users who have created issues, comments, or votes in the last 30 days)
    const activeUsersResult = await Database.query<CountResult>(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT reporter_id as user_id FROM issues WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT author_id as user_id FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT user_id FROM votes WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) as active_users
    `)
    const activeUsers = activeUsersResult[0]?.count || 0

    // Calculate average response time (time between issue creation and first status change to IN_PROGRESS or RESOLVED)
    const responseTimeResult = await Database.query<AvgHoursResult>(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
      FROM issues 
      WHERE status IN ('IN_PROGRESS', 'RESOLVED', 'REJECTED') 
      AND created_at != updated_at
    `)
    const avgResponseHours = responseTimeResult[0]?.avg_hours || 0
    const responseTime = avgResponseHours ? `${Math.round(avgResponseHours * 10) / 10} hrs` : "0 hrs"

    // Calculate trends (this month vs last month)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Total issues trend
    const thisMonthIssuesResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?',
      [currentMonth, currentYear]
    )
    const lastMonthIssuesResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?',
      [lastMonth, lastMonthYear]
    )
    
    const thisMonthIssues = thisMonthIssuesResult[0]?.count || 0
    const lastMonthIssues = lastMonthIssuesResult[0]?.count || 0
    const totalIssuesTrend = lastMonthIssues > 0 
      ? Math.round(((thisMonthIssues - lastMonthIssues) / lastMonthIssues) * 100)
      : thisMonthIssues > 0 ? 100 : 0

    // Resolved issues trend
    const thisMonthResolvedResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues WHERE status = "RESOLVED" AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?',
      [currentMonth, currentYear]
    )
    const lastMonthResolvedResult = await Database.query<CountResult>(
      'SELECT COUNT(*) as count FROM issues WHERE status = "RESOLVED" AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?',
      [lastMonth, lastMonthYear]
    )
    
    const thisMonthResolved = thisMonthResolvedResult[0]?.count || 0
    const lastMonthResolved = lastMonthResolvedResult[0]?.count || 0
    const resolvedIssuesTrend = lastMonthResolved > 0 
      ? Math.round(((thisMonthResolved - lastMonthResolved) / lastMonthResolved) * 100)
      : thisMonthResolved > 0 ? 100 : 0

    // Active users trend (this month vs last month)
    const thisMonthActiveUsersResult = await Database.query<CountResult>(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT reporter_id as user_id FROM issues 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
        UNION
        SELECT author_id as user_id FROM comments 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
        UNION
        SELECT user_id FROM votes 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      ) as active_users
    `, [currentMonth, currentYear, currentMonth, currentYear, currentMonth, currentYear])

    const lastMonthActiveUsersResult = await Database.query<CountResult>(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT reporter_id as user_id FROM issues 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
        UNION
        SELECT author_id as user_id FROM comments 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
        UNION
        SELECT user_id FROM votes 
        WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      ) as active_users
    `, [lastMonth, lastMonthYear, lastMonth, lastMonthYear, lastMonth, lastMonthYear])

    const thisMonthActiveUsers = thisMonthActiveUsersResult[0]?.count || 0
    const lastMonthActiveUsers = lastMonthActiveUsersResult[0]?.count || 0
    const activeUsersTrend = lastMonthActiveUsers > 0 
      ? Math.round(((thisMonthActiveUsers - lastMonthActiveUsers) / lastMonthActiveUsers) * 100)
      : thisMonthActiveUsers > 0 ? 100 : 0

    // Response time trend (lower is better, so we invert the logic)
    const thisMonthResponseTimeResult = await Database.query<AvgHoursResult>(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
      FROM issues 
      WHERE status IN ('IN_PROGRESS', 'RESOLVED', 'REJECTED') 
      AND created_at != updated_at
      AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?
    `, [currentMonth, currentYear])

    const lastMonthResponseTimeResult = await Database.query<AvgHoursResult>(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
      FROM issues 
      WHERE status IN ('IN_PROGRESS', 'RESOLVED', 'REJECTED') 
      AND created_at != updated_at
      AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?
    `, [lastMonth, lastMonthYear])

    const thisMonthResponseTime = thisMonthResponseTimeResult[0]?.avg_hours || 0
    const lastMonthResponseTime = lastMonthResponseTimeResult[0]?.avg_hours || 0
    
    let responseTimeTrend = 0
    if (lastMonthResponseTime > 0 && thisMonthResponseTime > 0) {
      // For response time, improvement means lower time, so we invert the calculation
      const improvement = ((lastMonthResponseTime - thisMonthResponseTime) / lastMonthResponseTime) * 100
      responseTimeTrend = Math.round(improvement)
    }

    const stats = {
      totalIssues,
      resolvedIssues,
      activeUsers,
      responseTime,
      trends: {
        totalIssues: {
          value: Math.abs(totalIssuesTrend),
          isPositive: totalIssuesTrend >= 0
        },
        resolvedIssues: {
          value: Math.abs(resolvedIssuesTrend),
          isPositive: resolvedIssuesTrend >= 0
        },
        activeUsers: {
          value: Math.abs(activeUsersTrend),
          isPositive: activeUsersTrend >= 0
        },
        responseTime: {
          value: Math.abs(responseTimeTrend),
          isPositive: responseTimeTrend >= 0
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}