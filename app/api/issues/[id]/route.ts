import type { NextRequest } from "next/server"
import { IssueModel, VoteModel, CommentModel, AuthUtils, UserModel, UserOrganizationModel } from "@/lib/db"
import { PerformanceMonitor } from "@/lib/performance"
import { emailService } from "@/lib/email-service"
interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/issues/[id] - Get a single issue
export async function GET(request: NextRequest, { params }: RouteParams) {
  const endTimer = PerformanceMonitor.start('GET /api/issues/[id]')

  try {
    const { id } = await params
    const issueId = Number.parseInt(id)

    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    const rawIssue = await IssueModel.findById(issueId)
    if (!rawIssue) {
      endTimer()
      return Response.json({ error: "Issue not found" }, { status: 404 })
    }

    // Check if user is authenticated and get their vote status
    let hasVoted = false
    try {
      const user = await AuthUtils.getCurrentUser(request)
      if (user) {
        const userVote = await VoteModel.findByIssueAndUser(issueId, user.id)
        hasVoted = !!userVote
      }
    } catch (error) {
      // User not authenticated, hasVoted remains false
    }

    // Get comments for this issue
    const comments = await CommentModel.getByIssueId(issueId)

    // Filter out any undefined comments and ensure they have required fields
    const validComments = (comments || []).filter(comment =>
      comment && comment.id && comment.content && comment.author_name
    )

    // Transform the data to match the expected Issue type structure
    const issue = {
      id: (rawIssue as any).id.toString(),
      title: (rawIssue as any).title,
      description: (rawIssue as any).description,
      category: (rawIssue as any).category,
      status: (rawIssue as any).status,
      priority: (rawIssue as any).priority,
      latitude: Number((rawIssue as any).latitude),
      longitude: Number((rawIssue as any).longitude),
      address: (rawIssue as any).address,
      imageUrl: (rawIssue as any).image_url,
      reporterId: (rawIssue as any).reporter_id?.toString(),
      reporter: {
        id: (rawIssue as any).reporter_id?.toString(),
        name: (rawIssue as any).reporter_name || 'Unknown',
        email: '', // Not included in query for privacy
        role: 'CITIZEN' as const,
        points: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      comments: validComments,
      votes: [],
      assignments: [],
      votes_count: (rawIssue as any).votes_count || 0,
      comments_count: (rawIssue as any).comments_count || 0,
      hasVoted, // Include user's vote status
      createdAt: new Date((rawIssue as any).created_at),
      updatedAt: new Date((rawIssue as any).updated_at)
    }

    endTimer()
    return Response.json({ issue })
  } catch (error) {
    console.error("Error fetching issue:", error)
    endTimer()
    return Response.json({ error: "Failed to fetch issue" }, { status: 500 })
  }
}

// PATCH /api/issues/[id] - Update issue (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const endTimer = PerformanceMonitor.start('PATCH /api/issues/[id]')

  try {
    const { id } = await params
    const issueId = Number.parseInt(id)

    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user is authenticated and is admin
    const currentUser = await AuthUtils.getCurrentUser(request)
    if (!currentUser || currentUser.role !== 'ADMIN') {
      endTimer()
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, priority } = body

    // Update the issue status
    if (status) {
      // Get the current issue details before updating
      const currentIssue = await IssueModel.findById(issueId)
      if (!currentIssue) {
        endTimer()
        return Response.json({ error: "Issue not found" }, { status: 404 })
      }

      const oldStatus = (currentIssue as any).status
      
      const issue = await IssueModel.updateStatus(issueId, status)
      if (issue) {
        console.log(issue);
        try {
          // Use the new comprehensive status update notification
          await emailService.sendStatusUpdateNotificationEmail(
            issue.email,
            issue.name,
            issueId,
            {
              title: issue.title,
              description: (currentIssue as any).description || 'No description available',
              category: (currentIssue as any).category || 'OTHER',
              address: (currentIssue as any).address || 'Location not specified',
              latitude: (currentIssue as any).latitude || 0,
              longitude: (currentIssue as any).longitude || 0,
              priority: (currentIssue as any).priority || "MEDIUM"
            },
            oldStatus,
            status,
            null, // No employee ID for system admin actions
            'System Administration', // Organization name for admin updates
            currentUser.name
          )
        } catch (emailError) {
          console.error('Failed to send status update notification email:', emailError)
        }
      } else {
        console.warn(`No user found for issueId=${issueId}`);
      }
    }

    endTimer()
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error updating issue:", error)
    endTimer()
    return Response.json({ error: "Failed to update issue" }, { status: 500 })
  }
}

// DELETE /api/issues/[id] - Delete issue and all related data (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const endTimer = PerformanceMonitor.start('DELETE /api/issues/[id]')

  try {
    const { id } = await params
    const issueId = Number.parseInt(id)

    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user is authenticated and is admin
    const currentUser = await AuthUtils.getCurrentUser(request)
    if (!currentUser || currentUser.role !== 'ADMIN') {
      endTimer()
      return Response.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    // Check if issue exists
    const issue = await IssueModel.findById(issueId)
    if (!issue) {
      endTimer()
      return Response.json({ error: "Issue not found" }, { status: 404 })
    }

    // Delete related data first (votes and comments) - CASCADE should handle this
    // But let's be explicit to ensure data integrity
    await VoteModel.deleteByIssueId(issueId)
    await CommentModel.deleteByIssueId(issueId)

    // Finally delete the issue itself
    const user = await UserModel.findById(issue.reporter_id);
    await IssueModel.delete(issueId)
    if (user) {
      try {
        await emailService.sendStatusUpdateEmail(user.email, issueId, issue.status, issue.title, user.name, true) //true for removing
      } catch (emailError) {
        console.error('Failed to send issue removed status email:', emailError)
      }
    } else {
      console.warn(`No user found for issueId=${issueId}`);
    }

    endTimer()
    return Response.json({
      success: true,
      message: "Issue and all related data deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting issue:", error)
    endTimer()
    return Response.json({ error: "Failed to delete issue" }, { status: 500 })
  }
}
