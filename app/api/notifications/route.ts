import { NextRequest, NextResponse } from 'next/server'
import { AuthUtils } from '@/lib/auth-utils'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await AuthUtils.getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is organization member or admin
    const isOrgMemberOrAdmin = user.role === 'ORGANIZATION_ADMIN' || 
      await checkIfOrganizationMember(user.id)

    if (!isOrgMemberOrAdmin) {
      return NextResponse.json({ 
        unreadCount: 0,
        notifications: [] 
      })
    }

    // Get user's organization(s)
    const userOrganizations = await Database.query(`
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = ? AND is_active = TRUE
    `, [user.id])

    if (userOrganizations.length === 0) {
      return NextResponse.json({ 
        unreadCount: 0,
        notifications: [] 
      })
    }

    const organizationIds = userOrganizations.map((org: any) => org.organization_id)
    const placeholders = organizationIds.map(() => '?').join(',')

    // Get new issues that match organization categories (last 7 days)
    const notifications = await Database.query(`
      SELECT 
        i.id,
        i.title,
        i.category,
        i.priority,
        i.address,
        i.created_at,
        u.name as reporter_name,
        u.role as reporter_role,
        CASE 
          WHEN ia.id IS NOT NULL THEN 'assigned'
          ELSE 'new'
        END as notification_type
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      LEFT JOIN category_organization_mappings com ON i.category = com.category
      LEFT JOIN issue_assignments ia ON i.id = ia.issue_id AND ia.organization_id IN (${placeholders})
      WHERE (
        com.organization_id IN (${placeholders})
        OR ia.organization_id IN (${placeholders})
      )
      AND i.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND i.status IN ('PENDING', 'IN_PROGRESS')
      ORDER BY i.created_at DESC
      LIMIT 20
    `, [...organizationIds, ...organizationIds, ...organizationIds])

    // Count unread notifications (issues created in last 24 hours)
    const unreadCount = await Database.queryOne(`
      SELECT COUNT(DISTINCT i.id) as count
      FROM issues i
      LEFT JOIN category_organization_mappings com ON i.category = com.category
      LEFT JOIN issue_assignments ia ON i.id = ia.issue_id AND ia.organization_id IN (${placeholders})
      WHERE (
        com.organization_id IN (${placeholders})
        OR ia.organization_id IN (${placeholders})
      )
      AND i.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND i.status IN ('PENDING', 'IN_PROGRESS')
    `, [...organizationIds, ...organizationIds, ...organizationIds])

    return NextResponse.json({
      unreadCount: (unreadCount as any)?.count || 0,
      notifications: notifications || []
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

async function checkIfOrganizationMember(userId: number): Promise<boolean> {
  try {
    const membership = await Database.queryOne(`
      SELECT id FROM user_organizations 
      WHERE user_id = ? AND is_active = TRUE
      LIMIT 1
    `, [userId])
    return !!membership
  } catch {
    return false
  }
}