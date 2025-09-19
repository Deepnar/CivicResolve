/**
 * Environment variables validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Database Configuration
  DB_HOST: z.string().min(1, 'Database host is required'),
  DB_PORT: z.coerce.number().min(1).max(65535, 'Database port must be between 1-65535'),
  DB_USER: z.string().min(1, 'Database user is required'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_NAME: z.string().min(1, 'Database name is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters long'),

  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // AI Configuration (optional)
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO'),
})

// Infer the type from the schema
export type Environment = z.infer<typeof envSchema>

// Validate and parse environment variables
function validateEnv(): Environment {
  try {
    const parsed = envSchema.parse(process.env)
    
    // Additional validation logic
    if (parsed.NODE_ENV === 'production') {
      // In production, these should be set
      if (!parsed.NEXTAUTH_SECRET) {
        throw new Error('NEXTAUTH_SECRET is required in production')
      }
      
      if (!parsed.NEXT_PUBLIC_APP_URL) {
        console.warn('NEXT_PUBLIC_APP_URL is recommended in production')
      }
    }

    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      
      console.error('❌ Invalid environment variables:\n', errorMessage)
      process.exit(1)
    }
    
    console.error('❌ Environment validation failed:', error)
    process.exit(1)
  }
}

// Export validated environment variables
export const env = validateEnv()

// Export individual configs for convenience
export const dbConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
}

export const jwtConfig = {
  secret: env.JWT_SECRET,
}

export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
}

// Utility function to check if we're in production
export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

console.log(`🚀 Environment: ${env.NODE_ENV}`)
if (isDev) {
  console.log('📊 Development mode - Enhanced logging enabled')
}
