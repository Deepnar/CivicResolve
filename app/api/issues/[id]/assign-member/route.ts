import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { Database } from "@/lib/database"
import { emailService } from "@/lib/email-service"
import { serverCacheInvalidate } from "@/lib/server-cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { assignedToId, assignedToName } = await request.json()
    
    console.log(`👥 [ASSIGN] Admin ${user.id} (${user.name}) attempting to assign issue ${id}`)
    console.log(`🎯 [ASSIGN] Target assignee: ${assignedToName} (ID: ${assignedToId})`)

    if (!assignedToId || !assignedToName) {
      console.log(`❌ [ASSIGN] Missing required fields - assignedToId: ${!!assignedToId}, assignedToName: ${!!assignedToName}`)
      return NextResponse.json({ error: "Assigned user ID and name are required" }, { status: 400 })
    }

    const issueId = parseInt(id)
    if (isNaN(issueId)) {
      console.log(`❌ [ASSIGN] Invalid issue ID: ${id}`)
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user has access to this issue (organization admin)
    const organizationCheck = await Database.queryOne(`
      SELECT uo.organization_id, uo.role
      FROM user_organizations uo 
      WHERE uo.user_id = ? AND uo.is_active = 1
    `, [user.id]) as { organization_id: string, role: string } | null

    if (!organizationCheck || organizationCheck.role !== 'ORGANIZATION_ADMIN') {
      console.log(`❌ [ASSIGN] Access denied - User role: ${organizationCheck?.role || 'none'}, Required: ORGANIZATION_ADMIN`)
      return NextResponse.json({ error: "Organization admin access required for assignment" }, { status: 403 })
    }
    
    console.log(`✅ [ASSIGN] Organization admin verified - Org ID: ${organizationCheck.organization_id}`)

    // Check if the issue belongs to organization's categories
    const issueCheck = await Database.queryOne(`
      SELECT i.id, i.category
      FROM issues i
      JOIN category_organization_mappings com ON i.category = com.category
      WHERE i.id = ? AND com.organization_id = ?
    `, [issueId, organizationCheck.organization_id]) as { id: number, category: string } | null

    if (!issueCheck) {
      console.log(`❌ [ASSIGN] Issue ${issueId} not found or not accessible to organization ${organizationCheck.organization_id}`)
      return NextResponse.json({ error: "Issue not found or not accessible" }, { status: 404 })
    }
    
    console.log(`✅ [ASSIGN] Issue ${issueId} found in category: ${issueCheck.category}`)

    // Check if assigned user is member of the same organization
    const assignedUserCheck = await Database.queryOne(`
      SELECT uo.user_id 
      FROM user_organizations uo 
      WHERE uo.user_id = ? AND uo.organization_id = ? AND uo.is_active = 1
    `, [assignedToId, organizationCheck.organization_id]) as { user_id: string } | null

    if (!assignedUserCheck) {
      console.log(`❌ [ASSIGN] User ${assignedToId} is not an active member of organization ${organizationCheck.organization_id}`)
      return NextResponse.json({ error: "Assigned user is not a member of your organization" }, { status: 400 })
    }
    
    console.log(`✅ [ASSIGN] Assignee ${assignedToId} is valid organization member`)

    // Update the issue with assignment information
    console.log(`🔄 [ASSIGN] Updating issue ${issueId} assignment in database...`)
    await Database.query(`
      UPDATE issues 
      SET assigned_to = ?, assigned_to_name = ?, assigned_at = NOW(), assigned_by = ?
      WHERE id = ?
    `, [assignedToId, assignedToName, user.id, issueId])
    console.log(`✅ [ASSIGN] Issue ${issueId} successfully assigned to ${assignedToName}`)

    // Invalidate cache after assignment (affects issue lists and stats)
    console.log(`🗑️ [ASSIGN] **CACHE INVALIDATION TRIGGERED** - Issue assignment updated`)
    console.log(`🎯 [ASSIGN] About to invalidate cache tags: ['issues', 'stats', 'analytics']`)
    await serverCacheInvalidate(['issues', 'stats', 'analytics'])
    console.log(`✅ [ASSIGN] Cache invalidation completed - fresh assignment data will be fetched on next request`)

    // Send assignment notification email
    console.log(`📧 [ASSIGN] Attempting to send assignment notification email...`)
    try {
      // Get the assigned user's email and the issue details
      const assignedUser = await Database.queryOne(`
        SELECT email FROM users WHERE id = ?
      `, [assignedToId]) as { email: string } | null

      const issueDetails = await Database.queryOne(`
        SELECT title, description, category, address, latitude, longitude 
        FROM issues WHERE id = ?
      `, [issueId]) as { 
        title: string, 
        description: string, 
        category: string, 
        address: string, 
        latitude: number, 
        longitude: number 
      } | null

      const organization = await Database.queryOne(`
        SELECT name FROM organizations WHERE id = ?
      `, [organizationCheck.organization_id]) as { name: string } | null

      if (assignedUser && issueDetails && organization) {
        console.log(`📮 [ASSIGN] Sending email to ${assignedUser.email} for issue "${issueDetails.title.substring(0, 30)}..."`)
        await emailService.sendAssignmentNotificationEmail(
          assignedUser.email,
          assignedToName,
          issueId,
          {
            title: issueDetails.title,
            description: issueDetails.description,
            category: issueDetails.category,
            address: issueDetails.address,
            latitude: issueDetails.latitude,
            longitude: issueDetails.longitude,
            priority: "MEDIUM"
          },
          user.name,
          organization.name
        )
        console.log(`✅ [ASSIGN] Assignment notification email sent successfully`)
      } else {
        console.log(`⚠️ [ASSIGN] Missing data for email - User: ${!!assignedUser}, Issue: ${!!issueDetails}, Org: ${!!organization}`)
      }
    } catch (emailError) {
      console.error('❌ [ASSIGN] Failed to send assignment notification email:', emailError)
      // Continue with success response even if email fails
    }

    console.log(`🎉 [ASSIGN] Assignment completed successfully - Issue ${issueId} assigned to ${assignedToName}`)
    return NextResponse.json({ 
      success: true, 
      message: `Issue assigned to ${assignedToName}`
    })

  } catch (error) {
    console.error("❌ [ASSIGN] Error assigning issue:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
