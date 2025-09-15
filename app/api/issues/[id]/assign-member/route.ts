import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { Database } from "@/lib/database"
import { emailService } from "@/lib/email-service"

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

    if (!assignedToId || !assignedToName) {
      return NextResponse.json({ error: "Assigned user ID and name are required" }, { status: 400 })
    }

    const issueId = parseInt(id)
    if (isNaN(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user has access to this issue (organization admin)
    const organizationCheck = await Database.queryOne(`
      SELECT uo.organization_id, uo.role
      FROM user_organizations uo 
      WHERE uo.user_id = ? AND uo.is_active = 1
    `, [user.id]) as { organization_id: string, role: string } | null

    if (!organizationCheck || organizationCheck.role !== 'ORGANIZATION_ADMIN') {
      return NextResponse.json({ error: "Organization admin access required for assignment" }, { status: 403 })
    }

    // Check if the issue belongs to organization's categories
    const issueCheck = await Database.queryOne(`
      SELECT i.id, i.category
      FROM issues i
      JOIN category_organization_mappings com ON i.category = com.category
      WHERE i.id = ? AND com.organization_id = ?
    `, [issueId, organizationCheck.organization_id]) as { id: number, category: string } | null

    if (!issueCheck) {
      return NextResponse.json({ error: "Issue not found or not accessible" }, { status: 404 })
    }

    // Check if assigned user is member of the same organization
    const assignedUserCheck = await Database.queryOne(`
      SELECT uo.user_id 
      FROM user_organizations uo 
      WHERE uo.user_id = ? AND uo.organization_id = ? AND uo.is_active = 1
    `, [assignedToId, organizationCheck.organization_id]) as { user_id: string } | null

    if (!assignedUserCheck) {
      return NextResponse.json({ error: "Assigned user is not a member of your organization" }, { status: 400 })
    }

    // Update the issue with assignment information
    await Database.query(`
      UPDATE issues 
      SET assigned_to = ?, assigned_to_name = ?, assigned_at = NOW(), assigned_by = ?
      WHERE id = ?
    `, [assignedToId, assignedToName, user.id, issueId])

    // Send assignment notification email
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
      }
    } catch (emailError) {
      console.error('Failed to send assignment notification email:', emailError)
      // Continue with success response even if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: `Issue assigned to ${assignedToName}`
    })

  } catch (error) {
    console.error("Error assigning issue:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
