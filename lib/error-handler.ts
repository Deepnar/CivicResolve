/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from './logger'
import { isProd } from './env'

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: string

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: string
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 400, true, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: string) {
    super(message, 401, true, context)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: string) {
    super(message, 403, true, context)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: string) {
    super(message, 404, true, context)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 500, true, context)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: string) {
    super(message, 429, true, context)
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    message: string
    statusCode: number
    context?: string
    details?: any
    timestamp: string
    requestId?: string
  }
}

// Main error handler for API routes
export function handleApiError(
  error: unknown,
  context: string = 'API',
  requestId?: string
): NextResponse<ErrorResponse> {
  let statusCode = 500
  let message = 'Internal server error'
  let details: any = undefined

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
    
    logger.error(
      `API Error: ${message}`,
      error,
      error.context || context,
      { statusCode, requestId }
    )
  } else if (error instanceof ZodError) {
    statusCode = 400
    message = 'Validation error'
    details = error.errors.reduce((acc, err) => {
      const path = err.path.join('.')
      acc[path] = err.message
      return acc
    }, {} as Record<string, string>)
    
    logger.warn(
      `Validation Error: ${JSON.stringify(details)}`,
      context,
      { requestId }
    )
  } else if (error instanceof Error) {
    message = isProd ? 'Internal server error' : error.message
    
    logger.error(
      `Unhandled Error: ${error.message}`,
      error,
      context,
      { requestId }
    )
  } else {
    message = isProd ? 'Internal server error' : String(error)
    
    logger.error(
      `Unknown Error: ${String(error)}`,
      undefined,
      context,
      { requestId }
    )
  }

  const errorResponse: ErrorResponse = {
    error: {
      message,
      statusCode,
      context,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    }
  }

  return NextResponse.json(errorResponse, { status: statusCode })
}

// Async error wrapper for API routes
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}

// Type guard to check if error is operational
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational
}

// Graceful error handler for unhandled promise rejections
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    logger.error(
      'Unhandled Promise Rejection',
      reason instanceof Error ? reason : new Error(String(reason)),
      'Global',
      { promise: promise.toString() }
    )
    
    // In production, we might want to exit gracefully
    if (isProd) {
      console.error('💥 Unhandled promise rejection! Shutting down...')
      process.exit(1)
    }
  })

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, 'Global')
    
    console.error('💥 Uncaught exception! Shutting down...')
    process.exit(1)
  })
}

// Utility to safely parse JSON with error handling
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch (error) {
    logger.warn('Failed to parse JSON', 'safeJsonParse', { json, error })
    return fallback
  }
}

// Utility to handle async operations with proper error logging
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    logger.error(
      `Safe async operation failed: ${context}`,
      error instanceof Error ? error : new Error(String(error)),
      'safeAsync'
    )
    return fallback
  }
}
