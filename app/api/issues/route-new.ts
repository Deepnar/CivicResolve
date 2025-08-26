import type { NextRequest } from "next/server"
import { z } from "zod"
import { IssueModel, AuthUtils } from "@/lib/db"

const createIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5, "Address is required"),
  image_url: z.string().url().optional(),
})

// GET /api/issues - Get all issues with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const status = searchParams.get("status") || undefined
    const priority = searchParams.get("priority") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const issues = await IssueModel.getAll({
      category,
      status,
      priority,
      limit,
      offset,
    })

    return Response.json({ issues })
  } catch (error) {
    console.error("Error fetching issues:", error)
    return Response.json({ error: "Failed to fetch issues" }, { status: 500 })
  }
}

// POST /api/issues - Create a new issue
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const body = await request.json()
    const issueData = createIssueSchema.parse(body)

    // Create the issue
    const issueId = await IssueModel.create({
      ...issueData,
      reporter_id: user.id,
    })

    // Get the created issue with all details
    const issue = await IssueModel.findById(issueId)

    // Award points to the user for reporting an issue
    // await UserModel.updatePoints(user.id, 10) // 10 points for reporting

    return Response.json(
      {
        issue,
        message: "Issue reported successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating issue:", error)
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    return Response.json(
      { error: "Failed to create issue" },
      { status: 500 }
    )
  }
}
