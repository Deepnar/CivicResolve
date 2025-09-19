import type { NextRequest } from "next/server"
import { VoteModel, AuthUtils } from "@/lib/db"
import { PerformanceMonitor } from "@/lib/performance"
import { serverCacheInvalidate } from "@/lib/server-cache"

// POST /api/issues/[id]/vote - Toggle vote for an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('POST /api/issues/[id]/vote')
  
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Check if user has already voted
    const existingVote = await VoteModel.findByIssueAndUser(issueId, user.id)
    console.log(`🗳️ [VOTE] User ${user.id} ${existingVote ? 'already voted' : 'has not voted'} on issue ${issueId}`)

    let message: string
    let votesCount: number

    if (existingVote) {
      // Remove the vote
      console.log(`➖ [VOTE] Removing vote for user ${user.id} on issue ${issueId}`)
      await VoteModel.delete(issueId, user.id)
      message = "Vote removed"
    } else {
      // Add the vote
      console.log(`➕ [VOTE] Adding vote for user ${user.id} on issue ${issueId}`)
      await VoteModel.create({
        issue_id: issueId,
        user_id: user.id,
      })
      message = "Vote added"
    }

    // Get updated vote count
    votesCount = await VoteModel.getCountByIssue(issueId)
    console.log(`📊 [VOTE] Updated vote count for issue ${issueId}: ${votesCount}`)

    // Invalidate cache after vote change (affects issue lists with vote counts)
    console.log(`🗑️ [VOTE] **CACHE INVALIDATION TRIGGERED** - Vote count changed`)
    console.log(`🎯 [VOTE] About to invalidate cache tags: ['issues', 'stats']`)
    await serverCacheInvalidate(['issues', 'stats'])
    console.log(`✅ [VOTE] Cache invalidation completed - fresh data will be fetched on next request`)

    endTimer()
    return Response.json({
      votesCount,
      hasVoted: !existingVote,
      message,
    })
  } catch (error) {
    console.error("Error toggling vote:", error)
    
    if (error instanceof Error && error.message === "Authentication required") {
      endTimer()
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    endTimer()
    return Response.json({ error: "Failed to toggle vote" }, { status: 500 })
  }
}

// GET /api/issues/[id]/vote - Check if user has voted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const endTimer = PerformanceMonitor.start('GET /api/issues/[id]/vote')
  
  try {
    // Get current user (optional for this endpoint)
    const user = await AuthUtils.getCurrentUser(request)
    
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      endTimer()
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    // Get vote count
    const votesCount = await VoteModel.getCountByIssue(issueId)

    let hasVoted = false
    if (user) {
      const existingVote = await VoteModel.findByIssueAndUser(issueId, user.id)
      hasVoted = !!existingVote
    }

    endTimer()
    return Response.json({
      votesCount,
      hasVoted,
    })
  } catch (error) {
    console.error("Error fetching vote status:", error)
    endTimer()
    return Response.json({ error: "Failed to fetch vote status" }, { status: 500 })
  }
}
