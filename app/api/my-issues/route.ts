import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }


    // Get issues reported by or assigned to this user
    const issues = await Database.query(`
      SELECT i.*, u.name as citizen_name, u.email as citizen_email,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes,
             assigned_users.name as assigned_to_name,
             assigner.name as assigned_by_name
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      LEFT JOIN users assigned_users ON i.assigned_to = assigned_users.id
      LEFT JOIN users assigner ON i.assigned_by = assigner.id
      WHERE i.assigned_to = ? OR i.reporter_id = ?
      ORDER BY i.created_at DESC
    `, [user.id, user.id])

    return NextResponse.json({ issues })

  } catch (error) {
    console.error('Error fetching user assigned issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assigned issues' },
      { status: 500 }
    )
  }
}
