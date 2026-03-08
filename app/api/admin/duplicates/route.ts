/**
 * GET /api/admin/duplicates
 * Retrieve pending duplicate issues for admin review
 */

import type { NextRequest } from 'next/server'
import { AuthUtils } from '@/lib/auth-utils'
import { DuplicateReviewQueueModel } from '@/lib/models'
import { withServerCache, SERVER_CACHE_TTL } from '@/lib/server-cache'
import { logger } from '@/lib/logger'
import { PerformanceMonitor } from '@/lib/performance'

export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/admin/duplicates')

  try {
    // Require admin authentication
    const user = await AuthUtils.requireAuth(request)
    
    if (user.role !== 'ADMIN') {
      return Response.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Cache key based on parameters
    const cacheKey = `admin:duplicates:${category || 'all'}:${limit}:${offset}`

    const result = await withServerCache(
      cacheKey,
      async () => {
        if (category && category !== 'all') {
          const items = await DuplicateReviewQueueModel.getByCategory(category)
          return {
            items,
            totalCount: items.length,
            totalPages: 1,
            currentPage: 1,
          }
        }

        return await DuplicateReviewQueueModel.getPaginated(limit, offset)
      },
      SERVER_CACHE_TTL.SHORT // 1 minute cache
    )

    logger.info(`Admin ${user.name} viewed duplicate review queue`)

    endTimer()
    return Response.json(result)
  } catch (error) {
    endTimer()
    logger.error('Error fetching duplicate review queue', error instanceof Error ? error : undefined, 'admin')
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    return Response.json(
      { error: 'Failed to fetch duplicate review queue' },
      { status: 500 }
    )
  }
}
