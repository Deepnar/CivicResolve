import type { NextRequest } from "next/server"
import { z } from "zod"
import { IssueUpdateModel, IssueModel, AuthUtils, UserOrganizationModel } from "@/lib/db"
import { PerformanceMonitor } from "@/lib/performance"
import { serverCacheInvalidate } from "@/lib/server-cache"

const createUpdateSchema = z.object({
  message: z.string().min(1, "Update message cannot be empty"),
  image: z.string().nullable().optional(), // Base64 encoded image
})

// GET /api/issues/[id]/updates - Get all updates for an issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('GET /api/issues/[id]/updates')
  
  try {
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Get all updates for the issue
    const updates = await IssueUpdateModel.findByIssueId(issueId)

    endTimer()
    return Response.json({ updates })
  } catch (error) {
    console.error("Error fetching issue updates:", error)
    endTimer()
    return Response.json({ error: "Failed to fetch updates" }, { status: 500 })
  }
}

// POST /api/issues/[id]/updates - Add a progress update to an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('POST /api/issues/[id]/updates')
  
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Get the issue to check assignment
    const issue = await IssueModel.findById(issueId)
    if (!issue) {
      endTimer()
      return Response.json({ error: "Issue not found" }, { status: 404 })
    }

    // Check permissions: user must be either assigned to the issue or an organization admin
    let isAuthorized = false

    // Check if user is assigned to the issue
    const assignedTo = (issue as any).assigned_to
    if (assignedTo !== null && assignedTo !== undefined && Number(assignedTo) === Number(user.id)) {
      isAuthorized = true
    }

    // Check if user is an organization admin for issues with organization assignments
    if (!isAuthorized && user.role === 'ORGANIZATION_ADMIN') {
      const userOrgs = await UserOrganizationModel.getByUser(user.id)
      const adminOrgs = userOrgs.filter((uo: any) => uo.role === 'ORGANIZATION_ADMIN')
      
      // If user is an org admin, they can post updates
      if (adminOrgs.length > 0) {
        isAuthorized = true
      }
    }

    // System admin can also post updates
    if (!isAuthorized && user.role === 'ADMIN') {
      isAuthorized = true
    }

    if (!isAuthorized) {
      endTimer()
      return Response.json(
        { error: "You are not authorized to post updates on this issue" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { message, image } = createUpdateSchema.parse(body)


    // Create the update
    const updateId = await IssueUpdateModel.create({
      issue_id: issueId,
      user_id: user.id,
      message,
      image_url: image || undefined,
    })

    // Get all updates for the issue to return
    const updates = await IssueUpdateModel.findByIssueId(issueId)

    // Invalidate cache after update creation
    await serverCacheInvalidate(['issues', 'updates'])

    endTimer()
    return Response.json(
      {
        updates,
        message: "Update posted successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating issue update:", error)
    
    if (error instanceof z.ZodError) {
      endTimer()
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === "Authentication required") {
      endTimer()
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    endTimer()
    return Response.json({ error: "Failed to create update" }, { status: 500 })
  }
}
