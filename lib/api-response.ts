/**
 * Standardized API error responses
 * Provides consistent error response format across all API endpoints
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

export class ApiResponseHandler {
  static success<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static error(
    message: string,
    statusCode: number = 500,
    error?: Error,
    code?: string,
    details?: any,
    context?: string
  ): NextResponse<ApiError> {
    // Log the error
    if (error) {
      logger.error(message, error, context, { statusCode, code, details });
    } else {
      logger.warn(message, context, { statusCode, code, details });
    }

    const errorResponse: ApiError = {
      error: this.getErrorType(statusCode),
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  static badRequest(message: string, details?: any): NextResponse<ApiError> {
    return this.error(message, 400, undefined, 'BAD_REQUEST', details, 'API');
  }

  static unauthorized(message: string = 'Authentication required'): NextResponse<ApiError> {
    return this.error(message, 401, undefined, 'UNAUTHORIZED', undefined, 'AUTH');
  }

  static forbidden(message: string = 'Access denied'): NextResponse<ApiError> {
    return this.error(message, 403, undefined, 'FORBIDDEN', undefined, 'AUTH');
  }

  static notFound(message: string = 'Resource not found'): NextResponse<ApiError> {
    return this.error(message, 404, undefined, 'NOT_FOUND', undefined, 'API');
  }

  static conflict(message: string, details?: any): NextResponse<ApiError> {
    return this.error(message, 409, undefined, 'CONFLICT', details, 'API');
  }

  static validation(message: string, errors: any[]): NextResponse<ApiError> {
    return this.error(message, 422, undefined, 'VALIDATION_ERROR', errors, 'VALIDATION');
  }

  static internal(message: string = 'Internal server error', error?: Error): NextResponse<ApiError> {
    return this.error(message, 500, error, 'INTERNAL_ERROR', undefined, 'SYSTEM');
  }

  private static getErrorType(statusCode: number): string {
    switch (Math.floor(statusCode / 100)) {
      case 4: return 'Client Error';
      case 5: return 'Server Error';
      default: return 'Error';
    }
  }
}
