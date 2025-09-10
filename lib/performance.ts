/**
 * Performance optimization utilities
 * Provides caching, memoization, and performance monitoring
 */

import { logger } from './logger'

// Simple in-memory cache with TTL
class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private readonly defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expiry })
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return item.value
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Global caches
export const apiCache = new MemoryCache<any>(10 * 60 * 1000) // 10 minutes
export const dataCache = new MemoryCache<any>(5 * 60 * 1000)  // 5 minutes
export const userCache = new MemoryCache<any>(15 * 60 * 1000) // 15 minutes

// Cleanup expired cache entries every 5 minutes
setInterval(() => {
  apiCache.cleanup()
  dataCache.cleanup()
  userCache.cleanup()
}, 5 * 60 * 1000)

// Memoization decorator
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  const cache = new MemoryCache<ReturnType<T>>(ttl)

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    let result = cache.get(key)
    if (result === undefined) {
      result = fn(...args)
      if (result !== undefined) {
        cache.set(key, result)
      }
    }
    
    return result
  }) as T
}

// Async memoization with Promise handling
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  const cache = new MemoryCache<Promise<Awaited<ReturnType<T>>>>(ttl)

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    let promise = cache.get(key)
    if (!promise) {
      promise = fn(...args).catch(error => {
        // Remove failed promises from cache
        cache.delete(key)
        throw error
      })
      cache.set(key, promise)
    }
    
    return promise
  }) as T
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCallTime >= delay) {
      lastCallTime = now
      func(...args)
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>()

  static start(label: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMeasurement(label, duration)
      logger.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`)
    }
  }

  static async measure<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - startTime
      this.recordMeasurement(label, duration)
      logger.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      logger.warn(`Performance: ${label} failed after ${duration.toFixed(2)}ms`)
      throw error
    }
  }

  private static recordMeasurement(label: string, duration: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, [])
    }
    
    const measurements = this.measurements.get(label)!
    measurements.push(duration)
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift()
    }
  }

  static getStats(label: string): {
    count: number
    average: number
    min: number
    max: number
  } | null {
    const measurements = this.measurements.get(label)
    if (!measurements || measurements.length === 0) {
      return null
    }

    return {
      count: measurements.length,
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements)
    }
  }

  static getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {}
    for (const [label] of this.measurements) {
      stats[label] = this.getStats(label)
    }
    return stats
  }
}

// Database query optimization helpers
export function optimizeQuery(query: string): string {
  // Basic query optimization hints
  let optimized = query.trim()
  
  // Add LIMIT if not present in SELECT queries to prevent runaway queries
  if (optimized.toUpperCase().startsWith('SELECT') && 
      !optimized.toUpperCase().includes('LIMIT') &&
      !optimized.toUpperCase().includes('COUNT(')) {
    logger.warn('Query without LIMIT detected, consider adding LIMIT clause', 'QueryOptimizer')
  }
  
  return optimized
}

// Batch processing utility
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    // Optional delay between batches to prevent overwhelming the system
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return results
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} {
  const memUsage = process.memoryUsage()
  const used = memUsage.heapUsed
  const total = memUsage.heapTotal
  
  return {
    used,
    total,
    percentage: (used / total) * 100
  }
}

// Log memory usage periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memory = getMemoryUsage()
    if (memory.percentage > 80) {
      logger.warn(
        `High memory usage: ${memory.percentage.toFixed(1)}%`,
        'MemoryMonitor',
        { used: `${(memory.used / 1024 / 1024).toFixed(2)}MB` }
      )
    }
  }, 30000) // Every 30 seconds
}
