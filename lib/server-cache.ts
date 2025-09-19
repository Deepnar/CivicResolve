/**
 * Server-only Redis cache implementation
 * This file should ONLY be imported in API routes and server-side code
 * DO NOT import this in middleware, components, or client-side code
 */

// Dynamic Redis import to avoid client-side bundling
let redis: any = null
let client: any = null

// Initialize Redis only on server side
async function initializeRedis() {
  if (typeof window !== 'undefined') {
    return null // Client side - no Redis
  }
  
  if (!redis) {
    try {
      redis = await import('redis')
    } catch (error) {
      console.warn('Redis module not available:', error)
      return null
    }
  }
  return redis
}

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
  database: parseInt(process.env.REDIS_DB || '0'),
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    keepAlive: 30000,
  },
  retry_strategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
}

export async function getServerRedisClient() {
  // Only initialize on server side
  const redisModule = await initializeRedis()
  if (!redisModule) {
    return null
  }
  
  if (!client) {
    // For production/cloud Redis
    if (process.env.REDIS_URL) {
      client = redisModule.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 60000,
          lazyConnect: true,
          keepAlive: 30000,
        }
      })
    } else {
      // For local Redis
      client = redisModule.createClient(redisConfig)
    }

    client.on('error', (err: any) => {
      console.error('Redis Client Error:', err)
    })

    client.on('connect', () => {
      console.log('✅ Redis client connected')
    })

    client.on('ready', () => {
      console.log('✅ Redis client ready')
    })

    client.on('end', () => {
      console.log('❌ Redis client disconnected')
    })

    // Connect to Redis
    try {
      await client.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      client = null
      throw error
    }
  }

  return client
}

// Check if Redis is available (server-side only)
export async function isServerRedisAvailable(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      return false
    }
    
    const client = await getServerRedisClient()
    return client && client.isOpen
  } catch (error) {
    return false
  }
}

// Cache TTL values
export const SERVER_CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  HOUR: 3600,
  DAY: 86400,
} as const

// Server-side cache operations
export async function serverCacheGet<T>(key: string): Promise<T | null> {
  try {
    if (!(await isServerRedisAvailable())) {
      console.log(`🔴 [CACHE] Redis not available - key: ${key}`)
      return null
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      console.log(`🔴 [CACHE] Redis client not available - key: ${key}`)
      return null
    }
    
    console.log(`🔍 [CACHE] Attempting to get key: ${key}`)
    const cached = await client.get(key)
    
    if (cached) {
      console.log(`✅ [CACHE HIT] Found cached data for key: ${key}`)
      console.log(`📊 [CACHE HIT] Data preview: ${cached.substring(0, 200)}${cached.length > 200 ? '...' : ''}`)
      return JSON.parse(cached)
    } else {
      console.log(`❌ [CACHE MISS] No cached data for key: ${key}`)
      return null
    }
  } catch (error) {
    console.warn(`🚨 [CACHE ERROR] Get failed for key: ${key}`, error)
    return null
  }
}

export async function serverCacheSet<T>(
  key: string, 
  value: T, 
  ttl: number = SERVER_CACHE_TTL.MEDIUM
): Promise<boolean> {
  try {
    if (!(await isServerRedisAvailable())) {
      console.log(`🔴 [CACHE] Redis not available for SET - key: ${key}`)
      return false
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      console.log(`🔴 [CACHE] Redis client not available for SET - key: ${key}`)
      return false
    }
    
    const serialized = JSON.stringify(value)
    console.log(`💾 [CACHE SET] Caching key: ${key}`)
    console.log(`⏱️ [CACHE SET] TTL: ${ttl} seconds (${Math.round(ttl/60)} minutes)`)
    console.log(`📊 [CACHE SET] Data size: ${serialized.length} characters`)
    console.log(`📄 [CACHE SET] Data preview: ${serialized.substring(0, 200)}${serialized.length > 200 ? '...' : ''}`)
    
    await client.setEx(key, ttl, serialized)
    console.log(`✅ [CACHE SET] Successfully cached key: ${key}`)
    return true
  } catch (error) {
    console.warn(`🚨 [CACHE ERROR] Set failed for key: ${key}`, error)
    return false
  }
}

export async function serverCacheInvalidate(tags: string[]): Promise<void> {
  try {
    if (!(await isServerRedisAvailable())) {
      console.log(`🔴 [CACHE] Redis not available for INVALIDATION - tags: ${tags.join(', ')}`)
      return
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      console.log(`🔴 [CACHE] Redis client not available for INVALIDATION - tags: ${tags.join(', ')}`)
      return
    }
    
    console.log(`🗑️ [CACHE INVALIDATE] Starting invalidation for tags: [${tags.join(', ')}]`)
    
    let totalInvalidated = 0
    
    // Find keys with tags and delete them - support multiple patterns
    for (const tag of tags) {
      console.log(`🔍 [CACHE INVALIDATE] Searching for keys with tag: "${tag}"`)
      
      // Pattern 1: Keys that start with the tag
      const keysStartingWithTag = await client.keys(`${tag}:*`)
      console.log(`📋 [CACHE INVALIDATE] Keys starting with "${tag}": ${keysStartingWithTag.length} found`, keysStartingWithTag)
      
      // Pattern 2: Keys that contain the tag (original pattern)
      const keysContainingTag = await client.keys(`*:${tag}:*`)
      console.log(`📋 [CACHE INVALIDATE] Keys containing "${tag}": ${keysContainingTag.length} found`, keysContainingTag)
      
      // Pattern 3: Keys that end with the tag
      const keysEndingWithTag = await client.keys(`*:${tag}`)
      console.log(`📋 [CACHE INVALIDATE] Keys ending with "${tag}": ${keysEndingWithTag.length} found`, keysEndingWithTag)
      
      // Combine all found keys and remove duplicates
      const allKeys = [...new Set([...keysStartingWithTag, ...keysContainingTag, ...keysEndingWithTag])]
      
      if (allKeys.length > 0) {
        console.log(`🗑️ [CACHE INVALIDATE] Deleting ${allKeys.length} cache keys for tag "${tag}":`)
        allKeys.forEach(key => console.log(`  ❌ Deleting: ${key}`))
        await client.del(allKeys)
        totalInvalidated += allKeys.length
      } else {
        console.log(`ℹ️ [CACHE INVALIDATE] No keys found for tag "${tag}"`)
      }
    }
    
    console.log(`✅ [CACHE INVALIDATE] Completed! Total keys invalidated: ${totalInvalidated}`)
  } catch (error) {
    console.warn(`🚨 [CACHE ERROR] Invalidation failed for tags: [${tags.join(', ')}]`, error)
  }
}

// Wrapper for caching function results
export async function withServerCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = SERVER_CACHE_TTL.MEDIUM
): Promise<T> {
  const startTime = Date.now()
  
  try {
    console.log(`🚀 [CACHE WRAPPER] Starting cache operation for key: ${key}`)
    
    // Try to get from cache first
    const cached = await serverCacheGet<T>(key)
    if (cached !== null) {
      const duration = Date.now() - startTime
      console.log(`🎯 [CACHE WRAPPER] Cache HIT! Returned cached data in ${duration}ms`)
      return cached
    }
    
    console.log(`📥 [CACHE WRAPPER] Cache MISS - executing fetch function`)
    const fetchStart = Date.now()
    
    // Fetch fresh data
    const data = await fetchFunction()
    
    const fetchDuration = Date.now() - fetchStart
    console.log(`⚡ [CACHE WRAPPER] Fetch completed in ${fetchDuration}ms`)
    
    // Cache the result
    const cacheSuccess = await serverCacheSet(key, data, ttl)
    
    const totalDuration = Date.now() - startTime
    console.log(`🏁 [CACHE WRAPPER] Operation completed in ${totalDuration}ms (fetch: ${fetchDuration}ms, cache: ${cacheSuccess ? 'success' : 'failed'})`)
    
    return data
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`💥 [CACHE WRAPPER] Error after ${duration}ms for key: ${key}`, error)
    throw error
  }
}