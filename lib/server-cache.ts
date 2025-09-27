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
      console.log('✅ Redis connected successfully')
    })
    
    client.on('ready', () => {
      console.log('🔥 Redis client ready for operations')
    })
    
    client.on('end', () => {
      console.warn('⚠️ Redis connection ended')
    })    // Connect to Redis
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
      return null
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      return null
    }
    
    const cached = await client.get(key)
    
    if (cached) {
      return JSON.parse(cached)
    } else {
      return null
    }
  } catch (error) {
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
      return false
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      return false
    }
    
    const serialized = JSON.stringify(value)
    await client.setEx(key, ttl, serialized)
    return true
  } catch (error) {
    return false
  }
}

export async function serverCacheInvalidate(tags: string[]): Promise<void> {
  try {
    if (!(await isServerRedisAvailable())) {
      return
    }
    
    const client = await getServerRedisClient()
    if (!client) {
      return
    }
    
    // Find keys with tags and delete them - support multiple patterns
    for (const tag of tags) {
      // Pattern 1: Keys that start with the tag
      const keysStartingWithTag = await client.keys(`${tag}:*`)
      
      // Pattern 2: Keys that contain the tag (original pattern)
      const keysContainingTag = await client.keys(`*:${tag}:*`)
      
      // Pattern 3: Keys that end with the tag
      const keysEndingWithTag = await client.keys(`*:${tag}`)
      
      // Combine all found keys and remove duplicates
      const allKeys = [...new Set([...keysStartingWithTag, ...keysContainingTag, ...keysEndingWithTag])]
      
      if (allKeys.length > 0) {
        await client.del(allKeys)
      }
    }
  } catch (error) {
    // Silently handle cache errors
  }
}

export async function withServerCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = SERVER_CACHE_TTL.MEDIUM
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await serverCacheGet<T>(key)
    if (cached !== null) {
      console.log(`💨 Cache HIT: ${key.split(':')[0]}`)
      return cached
    }
    
    console.log(`🔄 Cache MISS: ${key.split(':')[0]} - fetching fresh data`)
    
    // Fetch fresh data
    const data = await fetchFunction()
    
    // Cache the result
    await serverCacheSet(key, data, ttl)
    
    return data
  } catch (error) {
    console.error(`❌ Cache error for ${key}:`, error)
    throw error
  }
}