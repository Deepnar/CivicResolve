/**
 * Cache helper that safely handles cache invalidation without static imports
 * This prevents Redis from being bundled into client-side or middleware code
 */

export async function safeInvalidateCache(tags: string[]): Promise<void> {
  try {
    // Only run cache invalidation on server side
    if (typeof window !== 'undefined') {
      return // Client side - skip cache invalidation
    }

    // Dynamic import to avoid bundling issues
    const { serverCacheInvalidate } = await import('./server-cache')
    await serverCacheInvalidate(tags)
  } catch (error) {
    // Gracefully handle cache errors - don't break the application
    console.warn('Cache invalidation failed:', error)
  }
}