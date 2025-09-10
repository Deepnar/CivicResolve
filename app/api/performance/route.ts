import { NextRequest, NextResponse } from 'next/server'
import { PerformanceMonitor, getMemoryUsage } from '@/lib/performance'

export async function GET(request: NextRequest) {
  try {
    // Get all performance statistics
    const performanceStats = PerformanceMonitor.getAllStats()
    
    // Get memory usage
    const memoryUsage = getMemoryUsage()
    
    // Get system info
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      pid: process.pid,
    }

    // Calculate some aggregated metrics
    const aggregatedMetrics = {
      totalOperations: Object.values(performanceStats).reduce(
        (sum, stat) => sum + (stat?.count || 0), 0
      ),
      averageResponseTime: Object.values(performanceStats).reduce(
        (sum, stat) => sum + (stat?.average || 0), 0
      ) / Object.keys(performanceStats).length || 0,
      slowestOperation: Object.entries(performanceStats).reduce(
        (slowest, [label, stats]) => {
          if (stats && (!slowest || stats.max > slowest.duration)) {
            return { operation: label, duration: stats.max }
          }
          return slowest
        }, null as { operation: string; duration: number } | null
      )
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      memory: {
        ...memoryUsage,
        usedMB: Math.round(memoryUsage.used / 1024 / 1024),
        totalMB: Math.round(memoryUsage.total / 1024 / 1024)
      },
      performance: performanceStats,
      aggregated: aggregatedMetrics,
      system: systemInfo
    })

  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}
