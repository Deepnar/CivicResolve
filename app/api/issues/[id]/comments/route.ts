import type { NextRequest } from "next/server"
import { z } from "zod"
import { CommentModel, AuthUtils } from "@/lib/db"
import { PerformanceMonitor } from "@/lib/performance"

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
})

// GET /api/issues/[id]/comments - Get comments for an issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('GET /api/issues/[id]/comments')
  
  try {
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    const comments = await CommentModel.getByIssueId(issueId)

    endTimer()
    return Response.json({ comments })
  } catch (error) {
    console.error("Error fetching comments:", error)
    endTimer()
    return Response.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

// POST /api/issues/[id]/comments - Add a comment to an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('POST /api/issues/[id]/comments')
  
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    const body = await request.json()
    const { content } = createCommentSchema.parse(body)

    // Create the comment
    const commentId = await CommentModel.create({
      content,
      issue_id: issueId,
      author_id: user.id,
    })

    // Get all comments for the issue to return
    const comments = await CommentModel.getByIssueId(issueId)

    endTimer()
    return Response.json(
      {
        comments,
        message: "Comment added successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating comment:", error)
    
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
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
