import type { NextRequest } from "next/server"
import { VoteModel, AuthUtils } from "@/lib/db"

// POST /api/issues/[id]/vote - Toggle vote for an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user has already voted
    const existingVote = await VoteModel.findByIssueAndUser(issueId, user.id)

    let message: string
    let votesCount: number

    if (existingVote) {
      // Remove the vote
      await VoteModel.delete(issueId, user.id)
      message = "Vote removed"
    } else {
      // Add the vote
      await VoteModel.create({
        issue_id: issueId,
        user_id: user.id,
      })
      message = "Vote added"
    }

    // Get updated vote count
    votesCount = await VoteModel.getCountByIssue(issueId)

    return Response.json({
      votesCount,
      hasVoted: !existingVote,
      message,
    })
  } catch (error) {
    console.error("Error toggling vote:", error)
    
    if (error instanceof Error && error.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    return Response.json({ error: "Failed to toggle vote" }, { status: 500 })
  }
}

// GET /api/issues/[id]/vote - Check if user has voted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user (optional for this endpoint)
    const user = await AuthUtils.getCurrentUser(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Get vote count
    const votesCount = await VoteModel.getCountByIssue(issueId)

    let hasVoted = false
    if (user) {
      const existingVote = await VoteModel.findByIssueAndUser(issueId, user.id)
      hasVoted = !!existingVote
    }

    return Response.json({
      votesCount,
      hasVoted,
    })
  } catch (error) {
    console.error("Error fetching vote status:", error)
    return Response.json({ error: "Failed to fetch vote status" }, { status: 500 })
  }
}
