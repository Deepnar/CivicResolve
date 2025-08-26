import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database helper functions
export class Database {
  // Test connection
  static async testConnection() {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Execute query with parameters
  static async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows as any[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get a single row
  static async queryOne(sql: string, params: any[] = []): Promise<any> {
    try {
      const [rows] = await pool.execute(sql, params);
      const rowsArray = rows as any[];
      return rowsArray.length > 0 ? rowsArray[0] : null;
    } catch (error) {
      console.error('Database queryOne error:', error);
      throw error;
    }
  }

  // Insert and return the inserted ID
  static async insert(sql: string, params: any[] = []) {
    try {
      const [result] = await pool.execute(sql, params);
      return (result as any).insertId;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  // Update and return affected rows count
  static async update(sql: string, params: any[] = []) {
    try {
      const [result] = await pool.execute(sql, params);
      return (result as any).affectedRows;
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // Delete and return affected rows count
  static async delete(sql: string, params: any[] = []) {
    try {
      const [result] = await pool.execute(sql, params);
      return (result as any).affectedRows;
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }

  // Begin transaction
  static async beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  // Commit transaction
  static async commitTransaction(connection: any) {
    await connection.commit();
    connection.release();
  }

  // Rollback transaction
  static async rollbackTransaction(connection: any) {
    await connection.rollback();
    connection.release();
  }
}

export default pool;
