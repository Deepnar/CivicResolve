import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Check if ngos table exists
    const tableCheck = await Database.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ngos'
    `, [])
    
    if (tableCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'NGOs table does not exist. Please run the migration first.',
        tableExists: false
      })
    }
    
    // Get table structure
    const columns = await Database.query('DESCRIBE ngos', [])
    
    // Check for any existing data
    const dataCount = await Database.queryOne('SELECT COUNT(*) as count FROM ngos', [])
    
    // Check user role enum
    const userRoleCheck = await Database.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `, [])
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      columns,
      dataCount,
      userRoleEnum: userRoleCheck[0] ? (userRoleCheck[0] as any).COLUMN_TYPE : null
    })
    
  } catch (error: any) {
    console.error('Database diagnostic error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}