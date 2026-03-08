import type { NextRequest } from "next/server"
import { z } from "zod"
import { IssueModel, AuthUtils, Database } from "@/lib/db"
import { IssueAssignmentModel } from "@/lib/models"
import { PerformanceMonitor } from "@/lib/performance"
import { emailService } from "@/lib/email-service"
import { withServerCache, serverCacheInvalidate, SERVER_CACHE_TTL } from "@/lib/server-cache"
import { DuplicateDetection } from "@/lib/duplicate-detection"

const createIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5, "Address is required"),
  image_url: z.string().optional().nullable(), // Allow data URLs and null values
  is_anonymous: z.boolean().default(false),
  // Reporter acknowledgement for duplicate detection
  reporter_confirmed_unique: z.boolean().optional(),
  reporter_acknowledgement: z.enum(["SAME_ISSUE", "DIFFERENT_ISSUE"]).optional(),
  selected_duplicate_of: z.number().int().positive().optional(),
  // NGO-specific fields (optional for regular users)
  citizen_name: z.string().optional(),
  citizen_phone: z.string().optional(),
  ngo_notes: z.string().optional(),
})

// GET /api/issues - Get all issues with filters
export async function GET(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('GET /api/issues')

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const status = searchParams.get("status") || undefined
    const priority = searchParams.get("priority") || undefined
    const search = searchParams.get("search") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "40")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const excludeImages = searchParams.get("exclude_images") === "true"
    
    if (search) {
      console.log(`🔍 Search query: "${search}" (limit: ${limit})`)
    }

    // Create cache key based on filters
    const cacheKey = `issues:all:${category || 'all'}:${status || 'all'}:${priority || 'all'}:${search || ''}:${limit}:${offset}:${excludeImages}`

    const { issues: issuesList, totalCount, totalPages, currentPage, stats } = await withServerCache(
      cacheKey,
      async () => {
        const { issues: rawIssues, totalCount, stats } = await IssueModel.getAll({
          category,
          status,
          priority,
          search,
          limit,
          offset,
        })
        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(offset / limit) + 1

        // Transform the data to match the expected Issue type structure
        const transformedIssues = rawIssues.map((issue: any) => ({
          id: issue.id.toString(),
          title: issue.title,
          description: issue.description,
          category: issue.category,
          status: issue.status,
          priority: issue.priority,
          latitude: Number(issue.latitude),
          longitude: Number(issue.longitude),
          address: issue.address,
          imageUrl: excludeImages ? null : issue.image_url,
          resolutionImageUrl: excludeImages ? null : issue.resolution_image_url,
          reporterId: issue.reporter_id?.toString(),
          isAnonymous: issue.is_anonymous || false,
          reporter: {
            id: issue.reporter_id?.toString(),
            name: issue.reporter_name,
            email: '', // Not included in query for privacy
            role: issue.reporter_role || 'CITIZEN', // Use actual role from database
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

        return { issues: transformedIssues, totalCount, totalPages, currentPage, stats }
      },
      SERVER_CACHE_TTL.MEDIUM // 5 minutes cache
    )

    endTimer()
    return Response.json({
      issues: issuesList,
      totalCount,
      totalPages,
      currentPage,
      stats
    })

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

    // Run duplicate detection BEFORE creating the issue
    // Only skip if user selected "Different Issue" (confirmed unique)
    let duplicateDetectionResult = null
    
    // Skip detection only if user confirmed it's unique (DIFFERENT_ISSUE)
    const shouldRunDetection = !issueData.reporter_confirmed_unique || issueData.reporter_acknowledgement === 'SAME_ISSUE'
    
    if (shouldRunDetection) {
      try {
        console.log(`🔍 Running duplicate detection for new issue: "${issueData.title.substring(0, 50)}"`)
        
        duplicateDetectionResult = await DuplicateDetection.detectDuplicates({
          title: issueData.title,
          description: issueData.description,
          category: issueData.category,
          latitude: issueData.latitude,
          longitude: issueData.longitude,
        })

        // Only return 409 if user hasn't made a choice yet
        // If reporter_acknowledgement is set, user already reviewed - proceed with creation
        if (
          duplicateDetectionResult.isDuplicate && 
          duplicateDetectionResult.possibleDuplicates.length > 0 &&
          !issueData.reporter_acknowledgement // Only block if user hasn't acknowledged yet
        ) {
          console.log(`⚠️ Found ${duplicateDetectionResult.possibleDuplicates.length} possible duplicate(s) - returning for user confirmation`)
          endTimer()
          return Response.json(
            {
              duplicate_check_required: true,
              possible_duplicates: duplicateDetectionResult.possibleDuplicates,
              message: 'Similar issues found. Please review before submitting.',
            },
            { status: 409 } // Conflict status
          )
        }
        
        if (issueData.reporter_acknowledgement) {
          console.log(`✅ User acknowledged duplicates (${issueData.reporter_acknowledgement}), proceeding with creation`)
        } else {
          console.log(`✅ No duplicates detected, proceeding with issue creation`)
        }
      } catch (detectionError) {
        console.error('Duplicate detection failed:', detectionError)
        // Don't fail the request if duplicate detection fails
      }
    } else {
      console.log(`✅ User confirmed uniqueness (DIFFERENT_ISSUE), skipping duplicate detection`)
    }

    // Create the issue
    const issueId = await IssueModel.create({
      ...issueData,
      reporter_id: user.id,
      image_url: issueData.image_url || undefined, // Convert null to undefined
      is_anonymous: issueData.is_anonymous,
    })
    
    console.log(`✅ New issue created: #${issueId} by ${issueData.is_anonymous ? 'Anonymous User' : user.name} (${issueData.category})${issueData.is_anonymous ? ' [ANONYMOUS]' : ''}`)

    // Store duplicate detection results and reporter acknowledgement
    if (issueData.reporter_confirmed_unique) {
      try {
        // Store duplicate detection results if we have them
        if (duplicateDetectionResult) {
          await DuplicateDetection.storeDuplicateDetection(issueId, duplicateDetectionResult)
        }
        
        // Always store reporter acknowledgement when user has confirmed
        await Database.update(
          `UPDATE issues 
           SET reporter_confirmed_unique = ?, 
               reporter_acknowledgement = ?
           WHERE id = ?`,
          [true, issueData.reporter_acknowledgement || null, issueId]
        )
        
        console.log(`📝 Reporter confirmation stored for issue #${issueId} (acknowledgement: ${issueData.reporter_acknowledgement})`)
      } catch (storeError) {
        console.error('Failed to store reporter confirmation:', storeError)
      }
    } else if (issueData.reporter_acknowledgement === 'SAME_ISSUE' && issueData.selected_duplicate_of) {
      // User confirmed this is the same as an existing issue - link them
      try {
        await Database.update(
          `UPDATE issues 
           SET possible_duplicate_of = ?,
               duplicate_status = 'MERGED',
               reporter_confirmed_unique = 0,
               reporter_acknowledgement = 'SAME_ISSUE'
           WHERE id = ?`,
          [issueData.selected_duplicate_of, issueId]
        )
        
        // Create a duplicate relationship record
        const { DuplicateRelationshipModel, DuplicateDetectionAuditModel } = await import('@/lib/models')
        await DuplicateRelationshipModel.create({
          original_issue_id: issueData.selected_duplicate_of,
          duplicate_issue_id: issueId,
          action: 'MERGED',
          admin_id: user.id,
          similarity_score: duplicateDetectionResult?.possibleDuplicates?.find(
            (d: any) => d.issueId === issueData.selected_duplicate_of
          )?.similarityScore ?? undefined,
        })
        
        // Log to audit
        await DuplicateDetectionAuditModel.create({
          issue_id: issueId,
          action_type: 'MERGED',
          performed_by: user.id,
          details: {
            selected_duplicate_of: issueData.selected_duplicate_of,
            acknowledgement: 'SAME_ISSUE'
          }
        })
        
        // Store detection results if available
        if (duplicateDetectionResult) {
          await DuplicateDetection.storeDuplicateDetection(issueId, duplicateDetectionResult)
        }
        
        console.log(`🔗 Issue #${issueId} linked as duplicate of #${issueData.selected_duplicate_of}`)
      } catch (linkError) {
        console.error('Failed to link duplicate issue:', linkError)
      }
    } else if (duplicateDetectionResult) {
      // Store detection results even if no duplicates were found (for analytics)
      try {
        await DuplicateDetection.storeDuplicateDetection(issueId, duplicateDetectionResult)
        console.log(`📝 Duplicate detection results stored for issue #${issueId}`)
      } catch (storeError) {
        console.error('Failed to store duplicate detection:', storeError)
      }
    }

    // Log anonymous submission to audit table for security and moderation
    if (issueData.is_anonymous) {
      try {
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        
        await Database.insert(
          `INSERT INTO anonymous_submissions_audit (issue_id, reporter_id, ip_address_hash, user_agent_hash) 
           VALUES (?, ?, SHA2(?, 256), SHA2(?, 256))`,
          [issueId, user.id, ipAddress, userAgent]
        );
        
        console.log(`📝 Anonymous submission logged to audit table for issue #${issueId}`);
      } catch (auditError) {
        console.error('Failed to log anonymous submission to audit:', auditError);
        // Don't fail the request if audit logging fails
      }
    }

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

      // Check if user is NGO admin and send priority notifications
      if (user.role && user.role === 'NGO_ADMIN') {
        // Get NGO details for the user
        const { UserNGOModel, NGOModel } = await import('@/lib/models');
        const userNGOs = await UserNGOModel.getByUser(user.id);

        if (userNGOs.length > 0) {
          const ngo = await NGOModel.findById(userNGOs[0].ngo_id);

          if (ngo) {
            // Prepare NGO data for priority notification
            const ngoData = {
              ngo_id: ngo.id, // Include NGO ID for tracking
              name: ngo.name,
              citizen_name: issueData.citizen_name,
              citizen_phone: issueData.citizen_phone,
              ngo_notes: issueData.ngo_notes
            };

            // Send PRIORITY notifications to organizations
            await emailService.sendNGOPriorityNotificationToOrganizations(issueId, issueData, ngoData);
          } else {
            // Fallback to standard notifications
            await emailService.sendIssueNotificationToOrganizations(issueId, issueData);
          }
        } else {
          // Fallback to standard notifications
          await emailService.sendIssueNotificationToOrganizations(issueId, issueData);
        }
      } else {
        // Send standard notifications to organization members for regular users
        await emailService.sendIssueNotificationToOrganizations(issueId, issueData);
      }
    } catch (emailError) {
      console.error('Failed to send email notifications:', emailError);
    }

    // Get the created issue with all details
    const issue = await IssueModel.findById(issueId)

    // Invalidate issues cache when new issue is created
    await serverCacheInvalidate(['issues', 'list', 'stats'])
    console.log(`🗑️ Cache invalidated after new issue creation`)

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
