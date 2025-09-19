import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'scripts', 'simple-ngo-migration.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Executing ${statements.length} migration statements...`)
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim().length > 0) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        await Database.update(statement, [])
      }
    }
    
    console.log('NGO migration completed successfully!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'NGO migration completed successfully',
      statementsExecuted: statements.length
    })
    
  } catch (error: any) {
    console.error('NGO migration failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}