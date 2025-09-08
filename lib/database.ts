import mysql from 'mysql2/promise';
import { logger } from './logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

class DatabaseManager {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig | null = null;
  private initialized = false;

  private initialize(): void {
    if (this.initialized) return;

    // Only validate environment when actually needed
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '',
    };

    this.validateConfig();
    this.initialized = true;
  }

  private validateConfig(): void {
    if (!this.config) return;
    
    if (!this.config.user || !this.config.password || !this.config.database) {
      throw new Error(
        'Missing required database configuration. Please check DB_USER, DB_PASSWORD, and DB_NAME environment variables.'
      );
    }

    if (isNaN(this.config.port) || this.config.port <= 0) {
      throw new Error('Invalid database port. DB_PORT must be a valid positive number.');
    }
  }

  private createPool(): mysql.Pool {
    try {
      const poolConfig: mysql.PoolOptions = {
        ...this.config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: false, // Security: prevent SQL injection through multiple statements
        timezone: 'Z', // Use UTC
      };

      // Add SSL configuration only in production
      if (process.env.NODE_ENV === 'production') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      const pool = mysql.createPool(poolConfig);

      logger.info('Database connection pool created successfully');

      return pool;
    } catch (error) {
      logger.error('Failed to create database connection pool', error instanceof Error ? error : undefined, 'database');
      throw new Error('Database connection pool initialization failed');
    }
  }

  public getPool(): mysql.Pool {
    if (!this.initialized) {
      this.initialize();
    }
    
    if (!this.pool && this.config) {
      try {
        this.pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        logger.info('Database connection pool created successfully');
      } catch (error) {
        logger.error('Failed to create database connection pool', error instanceof Error ? error : undefined, 'database');
        throw new Error('Database pool creation failed');
      }
    }

    if (!this.pool) {
      throw new Error('Failed to initialize database pool');
    }

    return this.pool;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const pool = this.getPool();
      const connection = await pool.getConnection();
      
      await connection.ping();
      logger.info('Database connection test successful');
      
      connection.release();
      return true;
    } catch (error) {
      logger.error('Database connection test failed', error instanceof Error ? error : undefined, 'database');
      return false;
    }
  }

  public async executeQuery<T = any>(
    query: string, 
    params: any[] = [],
    operation?: string
  ): Promise<T> {
    const pool = this.getPool();
    const startTime = Date.now();
    
    try {
      logger.debug(`Executing database query: ${operation || 'unknown'}`);

      const [results] = await pool.execute(query, params);
      const duration = Date.now() - startTime;

      logger.debug(`Database query completed successfully in ${duration}ms`);

      return results as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Database query failed after ${duration}ms`, error instanceof Error ? error : undefined, 'database');

      // Re-throw with more context but don't expose sensitive query details
      if (error instanceof Error) {
        throw new Error(`Database operation failed: ${operation || 'query'} - ${error.message}`);
      }
      throw new Error(`Database operation failed: ${operation || 'query'}`);
    }
  }

  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      logger.debug('Database transaction started');
      
      const result = await callback(connection);
      
      await connection.commit();
      logger.debug('Database transaction committed successfully');
      
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('Database transaction rolled back', error instanceof Error ? error : undefined, 'database');
      throw error;
    } finally {
      connection.release();
    }
  }

  public async closePool(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.info('Database connection pool closed successfully');
        this.pool = null;
      } catch (error) {
        logger.error('Error closing database connection pool', error instanceof Error ? error : undefined, 'database');
        throw error;
      }
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

// Export the main interface
export const db = {
  query: <T = any>(query: string, params?: any[], operation?: string) => 
    databaseManager.executeQuery<T>(query, params, operation),
  
  transaction: <T>(callback: (connection: mysql.PoolConnection) => Promise<T>) => 
    databaseManager.transaction(callback),
  
  testConnection: () => databaseManager.testConnection(),
  
  close: () => databaseManager.closePool(),
  
  // Direct access to pool for advanced usage
  getPool: () => databaseManager.getPool()
};

// Export types for external use
export { mysql };

// Backward compatibility Database class for models.ts
export class Database {
  static async queryOne<T = any>(query: string, params: any[] = []): Promise<T | null> {
    const results = await db.query<T[]>(query, params, 'queryOne');
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  static async query<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const results = await db.query<T[]>(query, params, 'query');
    return Array.isArray(results) ? results : [];
  }

  static async insert(query: string, params: any[] = []): Promise<number> {
    const results = await db.query<mysql.ResultSetHeader>(query, params, 'insert');
    return results.insertId;
  }

  static async update(query: string, params: any[] = []): Promise<number> {
    const results = await db.query<mysql.ResultSetHeader>(query, params, 'update');
    return results.affectedRows || 0;
  }

  static async delete(query: string, params: any[] = []): Promise<number> {
    const results = await db.query<mysql.ResultSetHeader>(query, params, 'delete');
    return results.affectedRows || 0;
  }
}

// Note: Database connection testing is handled by individual API routes
// to avoid Edge Runtime compatibility issues in middleware

export default db;
