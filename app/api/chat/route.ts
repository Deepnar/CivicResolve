import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthUtils } from '@/lib/auth-utils';
import { Database } from '@/lib/database';
import { PerformanceMonitor } from '@/lib/performance';

// Enhanced TypeScript interfaces for comprehensive database results
interface IssueDetailsResult {
  id: number
  title: string
  description: string
  category: string
  status: string
  priority: string
  latitude: number
  longitude: number
  address: string
  image_url?: string
  created_at: Date
  updated_at: Date
  reporter_name: string
  reporter_email: string
  reporter_role: string
  reporter_verified: boolean
  comment_count: number
  vote_count: number
  assigned_to?: number
  assigned_to_name?: string
  assigned_at?: Date
  assigned_by?: number
  assigned_by_name?: string
  organization_name?: string
  organization_id?: number
  days_open: number
}

interface CommentResult {
  id: number
  content: string
  user_name: string
  user_role: string
  created_at: Date
}

interface CountResult {
  count: number
  total?: number
}

interface OrganizationStatsResult {
  id: number
  organization_name: string
  description: string
  created_at: Date
  member_count: number
  assigned_issues: number
  resolved_issues: number
  avg_resolution_days: number
  categories_handled: number
}

interface UserOrganizationResult {
  user_id: number
  organization_id: number
  organization_name: string
  organization_description: string
  user_role: string
  employee_id: string
  is_admin: boolean
  joined_date: Date
  days_with_organization: number
  user_name?: string
  user_email?: string
  user_verified?: boolean
}

interface CategoryMappingResult {
  organization_id: number
  organization_name: string
  mapping_id: number
  category_name: string
  mapping_created: Date
  issues_in_category: number
}

interface LocationStatsResult {
  status: string
  category: string
  priority: string
  count: number
  avg_days_open: number
  organization_name: string
  assigned_count: number
  unassigned_count: number
}

interface StatusResult {
  status: string
  count: number
  assigned_count: number
  unassigned_count: number
  avg_days: number
}

interface CategoryResult {
  category: string
  count: number
  assigned_count: number
  unassigned_count: number
  primary_organization: string
  secondary_organizations: string
}

interface PriorityResult {
  priority: string
  count: number
  assigned_percentage: number
  avg_resolution_days: number
}

interface LocationResult {
  address: string
  count: number
  status_breakdown: string
  primary_categories: string
}

interface TrendResult {
  date: string
  issues_reported: number
  issues_assigned: number
  issues_resolved: number
  category: string
  organization_assignments: number
}

interface UserEngagementResult {
  id: number
  name: string
  email: string
  role: string
  is_verified: boolean
  organization_name: string
  org_role: string
  employee_id: string
  issues_reported: number
  comments_made: number
  votes_cast: number
  issues_assigned: number
  issues_resolved: number
  total_activity: number
  last_active: Date
}

interface UrgentIssueResult {
  id: number
  title: string
  category: string
  priority: string
  address: string
  created_at: Date
  description: string
  status: string
  assigned_to_name: string
  organization_name: string
  days_open: number
  vote_count: number
  comment_count: number
}

interface AvgResolutionResult {
  avg_days: number
  category: string
  resolved_count: number
  organization_name: string
  efficiency_rating: string
}

interface IssueWithVotesResult {
  id: number
  title: string
  category: string
  status: string
  priority: string
  address: string
  created_at: Date
  vote_count: number
  comment_count: number
  assigned_to_name: string
  organization_name: string
  days_open: number
}

interface UserStatsResult {
  id: number
  name: string
  email: string
  role: string
  is_verified: boolean
  organization_name: string
  org_role: string
  employee_id: string
  issues_reported: number
  comments_made: number
  votes_cast: number
  issues_assigned: number
  issues_resolved: number
  points: number
  account_age_days: number
}

interface UserDetailsResult {
  id: number
  name: string
  email: string
  role: string
  is_verified: boolean
  created_at: Date
  updated_at: Date
  issues_reported: number
  comments_made: number
  votes_cast: number
  issues_assigned: number
  organizations: UserOrganizationResult[]
  recent_issues: IssueDetailsResult[]
}

interface LongStandingIssueResult {
  id: number
  title: string
  category: string
  priority: string
  address: string
  created_at: Date
  days_open: number
  assigned_to_name: string
  organization_name: string
  vote_count: number
  comment_count: number
  last_activity: Date
}

interface IssueAssignmentResult {
  issue_id: number
  issue_title: string
  organization_id: number
  organization_name: string
  assigned_at: Date
  assigned_by_name: string
  current_status: string
  days_since_assignment: number
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Function to get comprehensive issue details with all related data
async function getIssueDetails(issueId: string) {
  try {
    const issue = await Database.queryOne<IssueDetailsResult>(`
      SELECT 
        i.*,
        u.name as reporter_name,
        u.email as reporter_email,
        u.role as reporter_role,
        u.is_verified as reporter_verified,
        assignee.name as assigned_to_name,
        assigner.name as assigned_by_name,
        o.name as organization_name,
        o.id as organization_id,
        DATEDIFF(NOW(), i.created_at) as days_open,
        COUNT(DISTINCT c.id) as comment_count,
        COUNT(DISTINCT v.id) as vote_count
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      LEFT JOIN users assignee ON i.assigned_to = assignee.id
      LEFT JOIN users assigner ON i.assigned_by = assigner.id
      LEFT JOIN issue_assignments ia ON i.id = ia.issue_id
      LEFT JOIN organizations o ON ia.organization_id = o.id
      LEFT JOIN comments c ON i.id = c.issue_id
      LEFT JOIN votes v ON i.id = v.issue_id
      WHERE i.id = ?
      GROUP BY i.id
    `, [issueId]);

    if (issue) {
      // Get recent comments with user details
      const comments = await Database.query<CommentResult>(`
        SELECT 
          c.id,
          c.content, 
          u.name as user_name,
          u.role as user_role,
          c.created_at
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.issue_id = ?
        ORDER BY c.created_at DESC
        LIMIT 10
      `, [issueId]);

      // Get organization assignment history
      const assignmentHistory = await Database.query<IssueAssignmentResult>(`
        SELECT 
          ia.issue_id,
          i.title as issue_title,
          ia.organization_id,
          o.name as organization_name,
          ia.assigned_at,
          assigner.name as assigned_by_name,
          i.status as current_status,
          DATEDIFF(NOW(), ia.assigned_at) as days_since_assignment
        FROM issue_assignments ia
        LEFT JOIN organizations o ON ia.organization_id = o.id
        LEFT JOIN users assigner ON ia.assigned_by = assigner.id
        LEFT JOIN issues i ON ia.issue_id = i.id
        WHERE ia.issue_id = ?
        ORDER BY ia.assigned_at DESC
      `, [issueId]);

      return { 
        ...issue, 
        recent_comments: comments,
        assignment_history: assignmentHistory 
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching comprehensive issue details:', error);
    return null;
  }
}

// Function to get comprehensive user details with organization data
async function getUserDetails(userId: string) {
  try {
    const user = await Database.queryOne<UserDetailsResult>(`
      SELECT 
        u.*,
        COUNT(DISTINCT i.id) as issues_reported,
        COUNT(DISTINCT c.id) as comments_made,
        COUNT(DISTINCT v.id) as votes_cast,
        COUNT(DISTINCT assigned_issues.id) as issues_assigned
      FROM users u
      LEFT JOIN issues i ON u.id = i.reporter_id
      LEFT JOIN comments c ON u.id = c.author_id
      LEFT JOIN votes v ON u.id = v.user_id
      LEFT JOIN issues assigned_issues ON u.id = assigned_issues.assigned_to
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    if (user) {
      // Get user's organization memberships
      const organizations = await Database.query<UserOrganizationResult>(`
        SELECT 
          uo.user_id,
          uo.organization_id,
          o.name as organization_name,
          o.description as organization_description,
          uo.role as user_role,
          uo.employee_id,
          (CASE WHEN uo.role = 'ORGANIZATION_ADMIN' THEN TRUE ELSE FALSE END) as is_admin,
          uo.assigned_at as joined_date,
          DATEDIFF(NOW(), uo.assigned_at) as days_with_organization
        FROM user_organizations uo
        LEFT JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = ? AND uo.is_active = TRUE
        ORDER BY uo.assigned_at DESC
      `, [userId]);

      // Get recent issues for this user
      const recentIssues = await Database.query<IssueDetailsResult>(`
        SELECT 
          i.*,
          DATEDIFF(NOW(), i.created_at) as days_open,
          COUNT(DISTINCT c.id) as comment_count,
          COUNT(DISTINCT v.id) as vote_count
        FROM issues i
        LEFT JOIN comments c ON i.id = c.issue_id
        LEFT JOIN votes v ON i.id = v.issue_id
        WHERE i.reporter_id = ?
        GROUP BY i.id
        ORDER BY i.created_at DESC
        LIMIT 10
      `, [userId]);

      return { 
        ...user, 
        organizations,
        recent_issues: recentIssues 
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching comprehensive user details:', error);
    return null;
  }
}

// Function to get location-specific statistics
async function getLocationStats(location: string) {
  try {
    const locationData = await Database.query<LocationStatsResult>(`
      SELECT 
        status,
        category,
        priority,
        COUNT(*) as count,
        AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avg_days_open
      FROM issues 
      WHERE address LIKE ? 
      GROUP BY status, category, priority
    `, [`%${location}%`]);

    const totalLocationIssues = await Database.queryOne<CountResult>(`
      SELECT COUNT(*) as total FROM issues WHERE address LIKE ?
    `, [`%${location}%`]);

    return {
      location_stats: locationData,
      total_issues: totalLocationIssues?.total || 0
    };
  } catch (error) {
    console.error('Error fetching location stats:', error);
    return null;
  }
}
async function getPlatformStatistics() {
  try {
    // Get total counts with safe fallbacks
    const totalIssuesResult = await Database.query<CountResult>('SELECT COUNT(*) as count FROM issues');
    const totalUsersResult = await Database.query<CountResult>('SELECT COUNT(*) as count FROM users');
    const totalCommentsResult = await Database.query<CountResult>('SELECT COUNT(*) as count FROM comments');

    const totalIssues = totalIssuesResult?.[0]?.count || 0;
    const totalUsers = totalUsersResult?.[0]?.count || 0;
    const totalComments = totalCommentsResult?.[0]?.count || 0;

    // Get issues by status
    const issuesByStatus = await Database.query<StatusResult>(`
      SELECT status, COUNT(*) as count 
      FROM issues 
      GROUP BY status
    `);

    // Get issues by category
    const issuesByCategory = await Database.query<CategoryResult>(`
      SELECT category, COUNT(*) as count 
      FROM issues 
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Get issues by priority
    const issuesByPriority = await Database.query<PriorityResult>(`
      SELECT priority, COUNT(*) as count 
      FROM issues 
      GROUP BY priority
    `);

    // Get long-standing issues (older than 30 days without resolution)
    const longStandingIssues = await Database.query<LongStandingIssueResult>(`
      SELECT id, title, category, priority, address, created_at,
             DATEDIFF(NOW(), created_at) as days_open
      FROM issues 
      WHERE status != 'RESOLVED' AND DATEDIFF(NOW(), created_at) > 30
      ORDER BY days_open DESC
      LIMIT 10
    `);

    // Get issues by location/area
    const issuesByLocation = await Database.query<LocationResult>(`
      SELECT address, COUNT(*) as count 
      FROM issues 
      WHERE address IS NOT NULL AND address != ''
      GROUP BY address 
      ORDER BY count DESC
      LIMIT 15
    `);

    // Get recent activity trends (last 30 days)
    const recentTrends = await Database.query<TrendResult>(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as issues_reported,
        category
      FROM issues 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at), category
      ORDER BY date DESC, issues_reported DESC
    `);

    // Get user engagement stats
    const userEngagement = await Database.query<UserEngagementResult>(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT i.id) as issues_reported,
        COUNT(DISTINCT c.id) as comments_made,
        COUNT(DISTINCT v.issue_id) as votes_cast
      FROM users u
      LEFT JOIN issues i ON u.id = i.reporter_id
      LEFT JOIN comments c ON u.id = c.author_id
      LEFT JOIN votes v ON u.id = v.user_id
      GROUP BY u.id, u.name, u.email
      HAVING (issues_reported > 0 OR comments_made > 0 OR votes_cast > 0)
      ORDER BY (issues_reported + comments_made + votes_cast) DESC
      LIMIT 10
    `);

    // Get issues needing immediate attention (high priority + recent)
    const urgentIssues = await Database.query<UrgentIssueResult>(`
      SELECT id, title, category, priority, address, created_at, description
      FROM issues 
      WHERE priority = 'HIGH' AND status IN ('PENDING', 'IN_PROGRESS')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Calculate resolution times
    const avgResolutionTime = await Database.query<AvgResolutionResult>(`
      SELECT 
        AVG(DATEDIFF(updated_at, created_at)) as avg_days,
        category,
        COUNT(*) as resolved_count
      FROM issues 
      WHERE status = 'RESOLVED'
      GROUP BY category
    `);

    // Get issues with vote counts (most voted issues)
    const issuesWithVotes = await Database.query<IssueWithVotesResult>(`
      SELECT 
        i.id, 
        i.title, 
        i.category, 
        i.status, 
        i.priority, 
        i.address,
        i.created_at,
        COUNT(v.id) as vote_count
      FROM issues i
      LEFT JOIN votes v ON i.id = v.issue_id
      GROUP BY i.id, i.title, i.category, i.status, i.priority, i.address, i.created_at
      HAVING vote_count > 0
      ORDER BY vote_count DESC
      LIMIT 10
    `);

    // Get organization statistics and performance data
    const organizationStats = await Database.query<OrganizationStatsResult>(`
      SELECT 
        o.id,
        o.name as organization_name,
        o.description,
        o.created_at,
        COUNT(DISTINCT uo.user_id) as member_count,
        COUNT(DISTINCT ia.issue_id) as assigned_issues,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN ia.issue_id END) as resolved_issues,
        AVG(CASE WHEN i.status = 'RESOLVED' THEN DATEDIFF(i.updated_at, ia.assigned_at) END) as avg_resolution_days,
        COUNT(DISTINCT com.category) as categories_handled
      FROM organizations o
      LEFT JOIN user_organizations uo ON o.id = uo.organization_id
      LEFT JOIN issue_assignments ia ON o.id = ia.organization_id
      LEFT JOIN issues i ON ia.issue_id = i.id
      LEFT JOIN category_organization_mappings com ON o.id = com.organization_id
      GROUP BY o.id, o.name, o.description, o.created_at
      ORDER BY assigned_issues DESC
    `);

    // Get user-organization relationships and roles
    const userOrganizations = await Database.query<UserOrganizationResult>(`
      SELECT 
        uo.user_id,
        uo.organization_id,
        o.name as organization_name,
        o.description as organization_description,
        uo.role as user_role,
        uo.employee_id,
        (CASE WHEN uo.role = 'ORGANIZATION_ADMIN' THEN TRUE ELSE FALSE END) as is_admin,
        uo.assigned_at as joined_date,
        DATEDIFF(NOW(), uo.assigned_at) as days_with_organization,
        u.name as user_name,
        u.email as user_email,
        u.is_verified as user_verified
      FROM user_organizations uo
      LEFT JOIN organizations o ON uo.organization_id = o.id
      LEFT JOIN users u ON uo.user_id = u.id
      WHERE uo.is_active = TRUE
      ORDER BY uo.assigned_at DESC
      LIMIT 50
    `);

    // Get category mappings for organizations
    const categoryMappings = await Database.query<CategoryMappingResult>(`
      SELECT 
        com.organization_id,
        o.name as organization_name,
        com.id as mapping_id,
        com.category as category_name,
        com.created_at as mapping_created,
        COUNT(DISTINCT i.id) as issues_in_category
      FROM category_organization_mappings com
      LEFT JOIN organizations o ON com.organization_id = o.id
      LEFT JOIN issues i ON com.category = i.category AND EXISTS (
        SELECT 1 FROM issue_assignments ia WHERE ia.issue_id = i.id AND ia.organization_id = com.organization_id
      )
      GROUP BY com.organization_id, o.name, com.id, com.category, com.created_at
      ORDER BY issues_in_category DESC
    `);

    // Get issue assignment tracking and workload distribution
    const issueAssignments = await Database.query<IssueAssignmentResult>(`
      SELECT 
        ia.issue_id,
        i.title as issue_title,
        ia.organization_id,
        o.name as organization_name,
        ia.assigned_at,
        assigner.name as assigned_by_name,
        i.status as current_status,
        i.priority,
        i.category,
        DATEDIFF(NOW(), ia.assigned_at) as days_since_assignment,
        CASE WHEN i.status = 'RESOLVED' THEN DATEDIFF(i.updated_at, ia.assigned_at) ELSE NULL END as resolution_days
      FROM issue_assignments ia
      LEFT JOIN issues i ON ia.issue_id = i.id
      LEFT JOIN organizations o ON ia.organization_id = o.id
      LEFT JOIN users assigner ON ia.assigned_by = assigner.id
      ORDER BY ia.assigned_at DESC
      LIMIT 100
    `);

    return {
      totals: {
        issues: totalIssues,
        users: totalUsers,
        comments: totalComments,
        organizations: organizationStats?.length || 0
      },
      issuesByStatus: issuesByStatus || [],
      issuesByCategory: issuesByCategory || [],
      issuesByPriority: issuesByPriority || [],
      issuesByLocation: issuesByLocation || [],
      longStandingIssues: longStandingIssues || [],
      recentTrends: recentTrends || [],
      userEngagement: userEngagement || [],
      urgentIssues: urgentIssues || [],
      avgResolutionTime: avgResolutionTime || [],
      issuesWithVotes: issuesWithVotes || [],
      // Enhanced organization data
      organizationStats: organizationStats || [],
      userOrganizations: userOrganizations || [],
      categoryMappings: categoryMappings || [],
      issueAssignments: issueAssignments || []
    };
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    return null;
  }
}

// Function to get current user's statistics
async function getCurrentUserStats(userId: number) {
  try {
    const userStats = await Database.queryOne<UserStatsResult>(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT i.id) as issues_reported,
        COUNT(DISTINCT c.id) as comments_made,
        COUNT(DISTINCT v.issue_id) as votes_cast
      FROM users u
      LEFT JOIN issues i ON u.id = i.reporter_id
      LEFT JOIN comments c ON u.id = c.author_id
      LEFT JOIN votes v ON u.id = v.user_id
      WHERE u.id = ?
      GROUP BY u.id, u.name, u.email
    `, [userId]);

    return userStats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const endTimer = PerformanceMonitor.start('POST /api/chat')
  
  try {
    // Verify authentication
    const user = await AuthUtils.getCurrentUser(request);
    if (!user) {
      endTimer()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, context } = await request.json();

    if (!message) {
      endTimer()
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      endTimer()
      return NextResponse.json(
        { error: 'AI service not configured. Please set GEMINI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    // Fetch real-time platform statistics
    const platformStats = await getPlatformStatistics();
    
    // Get current user's personal statistics
    const currentUserStats = await getCurrentUserStats(user.id);

    // Check if user is asking about specific issue or location
    let additionalContext = '';
    
    // Extract issue ID from message if mentioned
    const issueIdMatch = message.match(/(?:issue|#)\s*(\d+)/i);
    if (issueIdMatch) {
      const issueDetails = await getIssueDetails(issueIdMatch[1]);
      if (issueDetails) {
        additionalContext += `\n\nSPECIFIC ISSUE DATA for Issue #${issueIdMatch[1]}:
- Title: "${issueDetails.title}"
- Status: ${issueDetails.status}
- Category: ${issueDetails.category}
- Priority: ${issueDetails.priority}
- Address: ${issueDetails.address}
- Reporter: ${issueDetails.reporter_name}
- Created: ${issueDetails.created_at}
- Comments: ${issueDetails.comment_count}
- Votes: ${issueDetails.vote_count}
- Description: ${issueDetails.description}
- Recent Comments: ${issueDetails.recent_comments?.map((c: any) => `"${c.content}" - ${c.user_name}`).join(', ') || 'None'}`;
      }
    }

    // Extract location from message if mentioned
    const locationKeywords = ['street', 'avenue', 'road', 'lane', 'boulevard', 'drive', 'way', 'place', 'area', 'district', 'neighborhood'];
    const words = message.toLowerCase().split(/\s+/);
    let mentionedLocation = '';
    
    for (let i = 0; i < words.length; i++) {
      if (locationKeywords.some(keyword => words[i].includes(keyword)) || 
          (words[i-1] && ['on', 'at', 'in', 'near'].includes(words[i-1]))) {
        mentionedLocation = words.slice(Math.max(0, i-1), i+2).join(' ');
        break;
      }
    }

    if (mentionedLocation) {
      const locationStats = await getLocationStats(mentionedLocation);
      if (locationStats && locationStats.total_issues > 0) {
        additionalContext += `\n\nLOCATION-SPECIFIC DATA for "${mentionedLocation}":
- Total Issues: ${locationStats.total_issues}
- Breakdown: ${locationStats.location_stats?.map(s => `${s.category} (${s.status}): ${s.count}`).join(', ')}`;
      }
    }

    // Filter data based on user role for security
    const isAdmin = user.role === 'ADMIN';
    
    // Create filtered system prompt based on user permissions
    let systemPrompt = '';
    
    if (isAdmin) {
      // Admin gets full access to platform statistics
      systemPrompt = `You are an intelligent assistant for CivicResolve, a civic engagement platform that helps citizens report and track community issues.

CURRENT USER INFORMATION (ADMIN):
- Name: ${user.name}
- Role: Administrator
${currentUserStats ? `
- Your Activity: ${currentUserStats.issues_reported} issues reported, ${currentUserStats.comments_made} comments made, ${currentUserStats.votes_cast} votes cast
` : '- Your Activity: No activity data available yet'}

CURRENT PLATFORM DATA (Admin-Level Statistics):
${platformStats ? `
Platform Overview:
- Total Issues: ${platformStats.totals.issues}
- Total Users: ${platformStats.totals.users}  
- Total Comments: ${platformStats.totals.comments}
- Total Organizations: ${platformStats.totals.organizations}

${platformStats.issuesByStatus.length > 0 ? `Issues by Status:
${platformStats.issuesByStatus.map(s => `- ${s.status}: ${s.count} issues`).join('\n')}` : 'No issues data available yet'}

${platformStats.issuesByCategory.length > 0 ? `Issues by Category (Most Common):
${platformStats.issuesByCategory.slice(0, 5).map(c => `- ${c.category}: ${c.count} issues`).join('\n')}` : 'No category data available yet'}

${platformStats.issuesByPriority.length > 0 ? `Issues by Priority:
${platformStats.issuesByPriority.map(p => `- ${p.priority}: ${p.count} issues`).join('\n')}` : 'No priority data available yet'}

${platformStats.issuesByLocation.length > 0 ? `Areas with Most Issues:
${platformStats.issuesByLocation.slice(0, 8).map(l => `- ${l.address}: ${l.count} issues`).join('\n')}` : 'No location data available yet'}

${platformStats.organizationStats.length > 0 ? `Organization Performance:
${platformStats.organizationStats.slice(0, 5).map(o => `- ${o.organization_name}: ${o.member_count} members, ${o.assigned_issues} issues assigned, ${o.resolved_issues} resolved${o.avg_resolution_days ? ` (avg ${Math.round(o.avg_resolution_days)} days)` : ''}`).join('\n')}` : 'No organization data available yet'}

${platformStats.userOrganizations.length > 0 ? `Recent Organization Activity:
${platformStats.userOrganizations.slice(0, 5).map(uo => `- ${uo.user_name} (${uo.user_role}) joined ${uo.organization_name} ${uo.days_with_organization} days ago`).join('\n')}` : 'No organization membership data yet'}

${platformStats.categoryMappings.length > 0 ? `Category-Organization Assignments:
${platformStats.categoryMappings.slice(0, 5).map(cm => `- ${cm.organization_name} handles ${cm.category_name} (${cm.issues_in_category} issues)`).join('\n')}` : 'No category mappings available yet'}

${platformStats.issueAssignments.length > 0 ? `Recent Issue Assignments:
${platformStats.issueAssignments.slice(0, 5).map(ia => `- Issue #${ia.issue_id} "${ia.issue_title}" assigned to ${ia.organization_name} (${ia.days_since_assignment} days ago, Status: ${ia.current_status})`).join('\n')}` : 'No assignment data available yet'}

${platformStats.longStandingIssues.length > 0 ? `Long-standing Issues (>30 days unresolved):
${platformStats.longStandingIssues.slice(0, 5).map(i => `- Issue #${i.id}: "${i.title}" in ${i.address} (${i.days_open} days old, Priority: ${i.priority})`).join('\n')}` : 'No long-standing issues currently'}

${platformStats.urgentIssues.length > 0 ? `Urgent Issues Needing Attention:
${platformStats.urgentIssues.slice(0, 5).map(i => `- Issue #${i.id}: "${i.title}" in ${i.address} (High Priority, Status: ${i.status || 'PENDING'})`).join('\n')}` : 'No urgent issues currently'}

${platformStats.avgResolutionTime.filter(r => r.avg_days).length > 0 ? `Average Resolution Times by Category:
${platformStats.avgResolutionTime.filter(r => r.avg_days).map(r => `- ${r.category}: ${Math.round(r.avg_days)} days average (${r.resolved_count} resolved)`).join('\n')}` : 'No resolution data available yet'}

${platformStats.userEngagement.length > 0 ? `Top Community Contributors:
${platformStats.userEngagement.slice(0, 5).map(u => `- ${u.name}: ${u.issues_reported} issues reported, ${u.comments_made} comments, ${u.votes_cast} votes`).join('\n')}` : 'No community engagement data yet'}
` : 'Platform statistics temporarily unavailable'}${additionalContext}

As an ADMINISTRATOR, you have access to detailed platform data and can help with:
- Platform management and oversight
- User management assistance  
- Detailed analytics and reporting
- System administration guidance
- Policy and governance questions
- Advanced troubleshooting

SECURITY NOTICE: You are assisting an administrator. You can provide detailed platform insights but should not expose sensitive personal data of other users (like emails, IDs, etc.) unless specifically needed for admin tasks.`;

    } else {
      // Regular users get limited, public information only
      systemPrompt = `You are an intelligent assistant for CivicResolve, a civic engagement platform that helps citizens report and track community issues.

CURRENT USER INFORMATION:
- Name: ${user.name}
${currentUserStats ? `
- Your Activity: ${currentUserStats.issues_reported} issues reported, ${currentUserStats.comments_made} comments made, ${currentUserStats.votes_cast} votes cast
` : '- Your Activity: No activity data available yet'}

COMMUNITY OVERVIEW (Public Information):
${platformStats ? `
- Community has ${platformStats.totals.issues} total issues reported
- ${platformStats.totals.users} community members participating

${platformStats.issuesByCategory.length > 0 ? `Most Common Issue Types:
${platformStats.issuesByCategory.slice(0, 3).map(c => `- ${c.category}: ${c.count} reports`).join('\n')}` : 'Various community issues being tracked'}

${platformStats.issuesByStatus.filter(s => s.status !== 'DELETED').length > 0 ? `Current Status Overview:
${platformStats.issuesByStatus.filter(s => s.status !== 'DELETED').map(s => `- ${s.status}: ${s.count} issues`).join('\n')}` : 'Issues in various stages of resolution'}
` : 'Community statistics temporarily unavailable'}${additionalContext}

Your role is to:
1. Help users understand how to use the platform effectively
2. Provide guidance on reporting civic issues (potholes, broken streetlights, graffiti, etc.)  
3. Explain the issue resolution process
4. Offer tips for community engagement
5. Answer questions about civic participation
6. Help with navigation and feature explanations
7. Provide general community insights (without sensitive details)

Key features of CivicResolve:
- Issue reporting with photos and location data
- Real-time tracking of issue status  
- Community voting and commenting on issues
- User profiles and engagement tracking
- Geographic mapping of issues

SECURITY GUIDELINES:
- NEVER reveal user IDs, email addresses, or internal system identifiers
- Do not provide detailed user information about other community members
- Focus on helping the user with their own activities and general community information
- If asked about personal details, only share what the user already knows about themselves
- Do not expose admin-level data, detailed analytics, or sensitive platform information

Guidelines:
- Be helpful, friendly, and informative
- Focus on civic engagement and community improvement
- **Use the real-time data to provide specific, actionable insights**
- **Highlight patterns, trends, and priority areas from the statistics**
- **Suggest which issues or areas need immediate attention**
- **Provide context about resolution times and community engagement**
- If you don't know something specific about the platform, be honest
- Encourage constructive community participation

IMPORTANT: When asked "Who am I?" or similar personal questions, only respond with public information like "You are ${user.name}, a community member who has reported ${currentUserStats?.issues_reported || 0} issues and cast ${currentUserStats?.votes_cast || 0} votes." Do NOT expose internal IDs, emails, or sensitive data.`;
    }

    // Get the generative model - using Gemini 2.0 Flash for faster responses
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Generate response using the filtered system prompt
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User Context: ${context ? JSON.stringify(context) : 'General inquiry'}` },
      { text: `User Message: ${message}` }
    ]);
    const response = await result.response;
    const text = response.text();

    endTimer()
    return NextResponse.json({ 
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        endTimer()
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('SAFETY')) {
        endTimer()
        return NextResponse.json(
          { error: 'Message content flagged for safety. Please rephrase your question.' },
          { status: 400 }
        );
      }
    }

    endTimer()
    return NextResponse.json(
      { error: 'Unable to process your request. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'CivicResolve Chat Assistant',
    status: 'operational',
    model: 'gemini-2.0-flash-lite',
    features: [
      'Platform guidance',
      'Issue reporting help',
      'Community engagement tips',
      'Feature explanations',
      'Civic participation advice'
    ]
  });
}
