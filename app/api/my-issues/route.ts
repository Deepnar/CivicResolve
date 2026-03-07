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
    const rawIssues = await Database.query(`
      SELECT i.*, 
             CASE WHEN i.is_anonymous = TRUE THEN 'Anonymous Citizen' ELSE u.name END as citizen_name,
             CASE WHEN i.is_anonymous = TRUE THEN '' ELSE u.email END as citizen_email,
             CASE WHEN i.is_anonymous = TRUE THEN 'CITIZEN' ELSE u.role END as reporter_role,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count,
             assigned_users.name as assigned_to_name,
             assigner.name as assigned_by_name
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      LEFT JOIN users assigned_users ON i.assigned_to = assigned_users.id
      LEFT JOIN users assigner ON i.assigned_by = assigner.id
      WHERE i.assigned_to = ? OR i.reporter_id = ?
      ORDER BY i.created_at DESC
    `, [user.id, user.id])

    // Transform issues to match Flutter's expected structure
    const issues = rawIssues.map((issue: any) => ({
      id: issue.id.toString(),
      title: issue.title,
      description: issue.description,
      category: issue.category,
      status: issue.status,
      priority: issue.priority,
      latitude: Number(issue.latitude),
      longitude: Number(issue.longitude),
      address: issue.address,
      imageUrl: issue.image_url,
      resolutionImageUrl: issue.resolution_image_url,
      reporterId: issue.reporter_id?.toString(),
      isAnonymous: issue.is_anonymous || false,
      reporter: {
        id: issue.reporter_id?.toString(),
        name: issue.citizen_name,  // This is already masked from SQL CASE statement
        email: issue.citizen_email || '',
        role: issue.reporter_role || 'CITIZEN',
        points: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      votes_count: issue.votes || 0,
      comments_count: issue.comments_count || 0,
      assigned_to: issue.assigned_to,
      assigned_to_name: issue.assigned_to_name,
      assigned_by_name: issue.assigned_by_name,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at)
    }))

    return NextResponse.json({ issues })

  } catch (error) {
    console.error('Error fetching user assigned issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assigned issues' },
      { status: 500 }
    )
  }
}
