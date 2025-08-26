import type { NextRequest } from "next/server"
import { IssueModel } from "@/lib/models"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/issues/[id] - Get a single issue
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const issueId = Number.parseInt(id)
    
    if (isNaN(issueId)) {
      return Response.json({ error: "Invalid issue ID" }, { status: 400 })
    }

    const rawIssue = await IssueModel.findById(issueId)
    
    if (!rawIssue) {
      return Response.json({ error: "Issue not found" }, { status: 404 })
    }

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
      comments: [],
      votes: [],
      assignments: [],
      votes_count: (rawIssue as any).votes_count || 0,
      comments_count: (rawIssue as any).comments_count || 0,
      createdAt: new Date((rawIssue as any).created_at),
      updatedAt: new Date((rawIssue as any).updated_at)
    }

    return Response.json({ issue })
  } catch (error) {
    console.error("Error fetching issue:", error)
    return Response.json({ error: "Failed to fetch issue" }, { status: 500 })
  }
}
