// Dynamic import for Redis to avoid client-side bundling
let redis: any = null
let client: any = null

// Initialize Redis only on server side
async function initializeRedis() {
  if (typeof window !== 'undefined') {
    return null // Client side - no Redis
  }
  
  if (!redis) {
    redis = await import('redis')
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
  // Connection pooling and performance options
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    keepAlive: 30000,
  },
  // Retry strategy
  retry_strategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
}

export async function getRedisClient() {
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

// Graceful shutdown
export async function disconnectRedis() {
  if (client) {
    try {
      await client.quit()
      client = null
      console.log('✅ Redis client disconnected gracefully')
    } catch (error) {
      console.error('Error disconnecting Redis:', error)
    }
  }
}

// Health check
export async function redisHealthCheck(): Promise<boolean> {
  try {
    // Return false if on client side
    if (typeof window !== 'undefined') {
      return false
    }
    
    const client = await getRedisClient()
    if (!client) return false
    
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

// Check if Redis is available
export async function isRedisAvailable(): Promise<boolean> {
  try {
    // Return false if on client side
    if (typeof window !== 'undefined') {
      return false
    }
    
    const client = await getRedisClient()
    return client && client.isOpen
  } catch (error) {
    return false
  }
}