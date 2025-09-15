import type { NextRequest } from "next/server"
import { z } from "zod"
import { IssueModel, AuthUtils } from "@/lib/db"
import { IssueAssignmentModel } from "@/lib/models"
import { PerformanceMonitor } from "@/lib/performance"
import { emailService } from "@/lib/email-service"

const createIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5, "Address is required"),
  image_url: z.string().optional().nullable(), // Allow data URLs and null values
})

// GET /api/issues - Get all issues with filters
export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/issues')
  
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const status = searchParams.get("status") || undefined
    const priority = searchParams.get("priority") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const rawIssues = await IssueModel.getAll({
      category,
      status,
      priority,
      limit,
      offset,
    })

    // Transform the data to match the expected Issue type structure
    const issues = rawIssues.map((issue: any) => ({
      id: issue.id.toString(),
      title: issue.title,
      description: issue.description,
      category: issue.category,
      status: issue.status,
      priority: issue.priority,
      latitude: Number(issue.latitude),
      longitude: Number(issue.longitude),
      address: issue.address,
      imageUrl: issue.image_url,
      reporterId: issue.reporter_id?.toString(),
      reporter: {
        id: issue.reporter_id?.toString(),
        name: issue.reporter_name,
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
      votes_count: issue.votes_count || 0, // Include database count
      comments_count: issue.comments_count || 0, // Include database count
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at)
    }))

    endTimer()
    return Response.json({ issues })
  } catch (error) {
    endTimer()
    console.error("Error fetching issues:", error)
    return Response.json({ error: "Failed to fetch issues" }, { status: 500 })
  }
}

// POST /api/issues - Create a new issue
export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/issues')
  
  try {
    // Require authentication
    const user = await AuthUtils.requireAuth(request)
    
    const body = await request.json()
    
    const validationResult = createIssueSchema.safeParse(body)
    if (!validationResult.success) {
      return Response.json({ 
        error: "Validation failed", 
        details: validationResult.error.flatten().fieldErrors 
      }, { status: 400 })
    }
    
    const issueData = validationResult.data

    // Create the issue
    const issueId = await IssueModel.create({
      ...issueData,
      reporter_id: user.id,
      image_url: issueData.image_url || undefined, // Convert null to undefined
    })

    // Automatically assign issue to responsible organizations
    try {
      await IssueAssignmentModel.assignIssueToOrganizations(issueId, user.id);
    } catch (assignmentError) {
      console.error('Failed to assign issue to organizations:', assignmentError);
    }

    // Send notifications to organizations and user
    try {
      // Send confirmation email to the user
      await emailService.sendIssueReportedEmail(user.email, issueId, issueData, user.name);
      
      // Send notifications to organization members
      await emailService.sendIssueNotificationToOrganizations(issueId, issueData);
    } catch (emailError) {
      console.error('Failed to send email notifications:', emailError);
    }

    // Get the created issue with all details
    const issue = await IssueModel.findById(issueId)

    // Award points to the user for reporting an issue
    // await UserModel.updatePoints(user.id, 10) // 10 points for reporting

    endTimer()
    return Response.json(
      {
        issue,
        message: "Issue reported successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    endTimer()
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
