/**
 * Type-safe database interfaces and utilities
 * Replaces unsafe 'any' types with proper TypeScript interfaces
 */

import type { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise'

// Base types for database operations
export type QueryResult<T> = [T, FieldPacket[]]
export type SelectResult<T> = T & RowDataPacket
export type InsertResult = ResultSetHeader
export type UpdateResult = ResultSetHeader
export type DeleteResult = ResultSetHeader

// User-related types
export interface UserRow extends RowDataPacket {
  id: number
  email: string
  name: string
  password: string
  role: 'CITIZEN' | 'ADMIN'
  points: number
  created_at: Date
  updated_at: Date
}

// Issue-related types
export interface IssueRow extends RowDataPacket {
  id: number
  title: string
  description: string
  category: string
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  latitude: number
  longitude: number
  address: string
  image_url: string | null
  reporter_id: number
  created_at: Date
  updated_at: Date
}

// Comment-related types
export interface CommentRow extends RowDataPacket {
  id: number
  content: string
  issue_id: number
  user_id: number
  created_at: Date
}

// Vote-related types
export interface VoteRow extends RowDataPacket {
  id: number
  issue_id: number
  user_id: number
  vote_type: 'UPVOTE' | 'DOWNVOTE'
  created_at: Date
}

// Analytics types
export interface AnalyticsRow extends RowDataPacket {
  total_issues: number
  resolved_issues: number
  pending_issues: number
  total_users: number
  active_users: number
}

// Database parameter types
export type DatabaseParams = (string | number | Date | boolean | null)[]

// Query builder types for type safety
export interface WhereClause {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN'
  value: string | number | Date | boolean | null | (string | number)[]
}

export interface OrderByClause {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface SelectOptions {
  where?: WhereClause[]
  orderBy?: OrderByClause[]
  limit?: number
  offset?: number
}

// Utility functions for type-safe query building
export function buildWhereClause(clauses: WhereClause[]): { sql: string; params: DatabaseParams } {
  if (clauses.length === 0) {
    return { sql: '', params: [] }
  }

  const conditions: string[] = []
  const params: DatabaseParams = []

  for (const clause of clauses) {
    if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
      if (Array.isArray(clause.value)) {
        const placeholders = clause.value.map(() => '?').join(', ')
        conditions.push(`${clause.field} ${clause.operator} (${placeholders})`)
        params.push(...clause.value)
      }
    } else {
      conditions.push(`${clause.field} ${clause.operator} ?`)
      params.push(clause.value as string | number | Date | boolean | null)
    }
  }

  return {
    sql: ` WHERE ${conditions.join(' AND ')}`,
    params
  }
}

export function buildOrderByClause(clauses: OrderByClause[]): string {
  if (clauses.length === 0) {
    return ''
  }

  const orderBys = clauses.map(clause => `${clause.field} ${clause.direction}`)
  return ` ORDER BY ${orderBys.join(', ')}`
}

export function buildLimitClause(limit?: number, offset?: number): { sql: string; params: DatabaseParams } {
  if (!limit) {
    return { sql: '', params: [] }
  }

  if (offset) {
    return { sql: ' LIMIT ? OFFSET ?', params: [limit, offset] }
  }

  return { sql: ' LIMIT ?', params: [limit] }
}
