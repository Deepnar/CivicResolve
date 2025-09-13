import type { NextRequest } from "next/server"
import { ApiResponseHandler } from "@/lib/api-response"
import { DatabaseMaintenance } from "@/lib/database-maintenance"

/**
 * Database maintenance endpoint
 * Should be called periodically (e.g., via cron job)
 * Requires authentication in production
 */
export async function POST(request: NextRequest) {
  try {
    // In production, verify maintenance secret key
    if (process.env.NODE_ENV === 'production') {
      const maintenanceSecret = request.headers.get('x-maintenance-secret')
      if (!maintenanceSecret || maintenanceSecret !== process.env.MAINTENANCE_SECRET) {
        return ApiResponseHandler.unauthorized("Invalid maintenance credentials")
      }
    }

    const results = await DatabaseMaintenance.runMaintenance()
    
    return ApiResponseHandler.success({
      maintenance: {
        timestamp: new Date().toISOString(),
        results
      }
    }, "Database maintenance completed successfully")
    
  } catch (error) {
    console.error('Database maintenance failed:', error)
    return ApiResponseHandler.internal("Maintenance failed", error as Error)
  }
}

/**
 * Get database health statistics
 */
export async function GET(request: NextRequest) {
  try {
    // In production, verify maintenance secret key
    if (process.env.NODE_ENV === 'production') {
      const maintenanceSecret = request.headers.get('x-maintenance-secret')
      if (!maintenanceSecret || maintenanceSecret !== process.env.MAINTENANCE_SECRET) {
        return ApiResponseHandler.unauthorized("Invalid maintenance credentials")
      }
    }

    const healthStats = await DatabaseMaintenance.getDatabaseHealth()
    
    return ApiResponseHandler.success({
      health: {
        timestamp: new Date().toISOString(),
        stats: healthStats
      }
    }, "Database health check completed")
    
  } catch (error) {
    console.error('Database health check failed:', error)
    return ApiResponseHandler.internal("Health check failed", error as Error)
  }
}
