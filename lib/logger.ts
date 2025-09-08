/**
 * Production-ready logging utility
 * Replaces console.log/error statements with structured logging
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN', 
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): void {
    const { timestamp, level, message, context, metadata, error } = entry;
    
    if (this.isDevelopment) {
      // Development: Use console with colors
      const prefix = `[${timestamp}] ${level}`;
      const fullMessage = context ? `${prefix} [${context}] ${message}` : `${prefix} ${message}`;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(fullMessage, metadata || '', error?.stack || '');
          break;
        case LogLevel.WARN:
          console.warn(fullMessage, metadata || '');
          break;
        case LogLevel.INFO:
          console.info(fullMessage, metadata || '');
          break;
        case LogLevel.DEBUG:
          console.debug(fullMessage, metadata || '');
          break;
      }
    } else {
      // Production: JSON structured logs for log aggregation
      const logData = {
        timestamp,
        level,
        message,
        context,
        metadata,
        ...(error && {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        })
      };
      
      console.log(JSON.stringify(logData));
    }
  }

  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    this.formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      metadata,
      error
    });
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
      metadata
    });
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
      metadata
    });
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.formatLog({
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        message,
        context,
        metadata
      });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
