import { Database } from '@/lib/database'

/**
 * Database maintenance utilities for production
 */
export class DatabaseMaintenance {
  /**
   * Clean up expired verification tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const affectedRows = await Database.update(`
        UPDATE users 
        SET verification_token = NULL, verification_token_expires = NULL 
        WHERE verification_token_expires < NOW() 
        AND verification_token IS NOT NULL
      `, [])
      
      if (process.env.NODE_ENV === 'development' && affectedRows > 0) {
        console.log(`Cleaned up ${affectedRows} expired verification tokens`)
      }
      
      return affectedRows
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error)
      throw error
    }
  }

  /**
   * Clean up unverified users older than specified days
   */
  static async cleanupUnverifiedUsers(daysOld: number = 30): Promise<number> {
    try {
      const affectedRows = await Database.delete(`
        DELETE FROM users 
        WHERE is_verified = FALSE 
        AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [daysOld])
      
      if (process.env.NODE_ENV === 'development' && affectedRows > 0) {
        console.log(`Cleaned up ${affectedRows} unverified users older than ${daysOld} days`)
      }
      
      return affectedRows
    } catch (error) {
      console.error('Failed to cleanup unverified users:', error)
      throw error
    }
  }

  /**
   * Get database health statistics
   */
  static async getDatabaseHealth(): Promise<{
    totalUsers: number
    verifiedUsers: number
    unverifiedUsers: number
    expiredTokens: number
    oldUnverifiedUsers: number
  }> {
    try {
      const stats: any = await Database.queryOne(`
        SELECT 
          COUNT(*) as totalUsers,
          SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verifiedUsers,
          SUM(CASE WHEN is_verified = FALSE THEN 1 ELSE 0 END) as unverifiedUsers,
          SUM(CASE WHEN verification_token_expires < NOW() AND verification_token IS NOT NULL THEN 1 ELSE 0 END) as expiredTokens,
          SUM(CASE WHEN is_verified = FALSE AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as oldUnverifiedUsers
        FROM users
      `, [])
      
      return {
        totalUsers: stats?.totalUsers || 0,
        verifiedUsers: stats?.verifiedUsers || 0,
        unverifiedUsers: stats?.unverifiedUsers || 0,
        expiredTokens: stats?.expiredTokens || 0,
        oldUnverifiedUsers: stats?.oldUnverifiedUsers || 0
      }
    } catch (error) {
      console.error('Failed to get database health:', error)
      throw error
    }
  }

  /**
   * Run all maintenance tasks
   */
  static async runMaintenance(): Promise<{
    expiredTokensCleared: number
    oldUsersCleared: number
    healthStats: any
  }> {
    try {
      const expiredTokensCleared = await this.cleanupExpiredTokens()
      const oldUsersCleared = await this.cleanupUnverifiedUsers(30)
      const healthStats = await this.getDatabaseHealth()
      
      return {
        expiredTokensCleared,
        oldUsersCleared,
        healthStats
      }
    } catch (error) {
      console.error('Database maintenance failed:', error)
      throw error
    }
  }
}
