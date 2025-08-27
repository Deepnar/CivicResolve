import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthUtils } from '@/lib/auth-utils';
import { Database } from '@/lib/database';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Function to get specific issue details if mentioned
async function getIssueDetails(issueId: string) {
  try {
    const issue = await Database.queryOne(`
      SELECT i.*, u.name as reporter_name,
             COUNT(DISTINCT c.id) as comment_count,
             COUNT(DISTINCT v.id) as vote_count
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      LEFT JOIN comments c ON i.id = c.issue_id
      LEFT JOIN votes v ON i.id = v.issue_id
      WHERE i.id = ?
      GROUP BY i.id
    `, [issueId]);

    if (issue) {
      const comments = await Database.query(`
        SELECT c.content, u.name as commenter_name, c.created_at
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.issue_id = ?
        ORDER BY c.created_at DESC
        LIMIT 5
      `, [issueId]);

      return { ...issue, recent_comments: comments };
    }
    return null;
  } catch (error) {
    console.error('Error fetching issue details:', error);
    return null;
  }
}

// Function to get location-specific statistics
async function getLocationStats(location: string) {
  try {
    const locationData = await Database.query(`
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

    const totalLocationIssues = await Database.queryOne(`
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
    const totalIssuesResult = await Database.query('SELECT COUNT(*) as count FROM issues');
    const totalUsersResult = await Database.query('SELECT COUNT(*) as count FROM users');
    const totalCommentsResult = await Database.query('SELECT COUNT(*) as count FROM comments');

    const totalIssues = totalIssuesResult?.[0]?.count || 0;
    const totalUsers = totalUsersResult?.[0]?.count || 0;
    const totalComments = totalCommentsResult?.[0]?.count || 0;

    // Get issues by status
    const issuesByStatus = await Database.query(`
      SELECT status, COUNT(*) as count 
      FROM issues 
      GROUP BY status
    `);

    // Get issues by category
    const issuesByCategory = await Database.query(`
      SELECT category, COUNT(*) as count 
      FROM issues 
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Get issues by priority
    const issuesByPriority = await Database.query(`
      SELECT priority, COUNT(*) as count 
      FROM issues 
      GROUP BY priority
    `);

    // Get long-standing issues (older than 30 days without resolution)
    const longStandingIssues = await Database.query(`
      SELECT id, title, category, priority, address, created_at,
             DATEDIFF(NOW(), created_at) as days_open
      FROM issues 
      WHERE status != 'RESOLVED' AND DATEDIFF(NOW(), created_at) > 30
      ORDER BY days_open DESC
      LIMIT 10
    `);

    // Get issues by location/area
    const issuesByLocation = await Database.query(`
      SELECT address, COUNT(*) as count 
      FROM issues 
      WHERE address IS NOT NULL AND address != ''
      GROUP BY address 
      ORDER BY count DESC
      LIMIT 15
    `);

    // Get recent activity trends (last 30 days)
    const recentTrends = await Database.query(`
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
    const userEngagement = await Database.query(`
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
    const urgentIssues = await Database.query(`
      SELECT id, title, category, priority, address, created_at, description
      FROM issues 
      WHERE priority = 'HIGH' AND status IN ('PENDING', 'IN_PROGRESS')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Calculate resolution times
    const avgResolutionTime = await Database.query(`
      SELECT 
        AVG(DATEDIFF(updated_at, created_at)) as avg_days,
        category,
        COUNT(*) as resolved_count
      FROM issues 
      WHERE status = 'RESOLVED'
      GROUP BY category
    `);

    // Get issues with vote counts (most voted issues)
    const issuesWithVotes = await Database.query(`
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

    return {
      totals: {
        issues: totalIssues,
        users: totalUsers,
        comments: totalComments
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
      issuesWithVotes: issuesWithVotes || []
    };
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    return null;
  }
}

// Function to get current user's statistics
async function getCurrentUserStats(userId: number) {
  try {
    const userStats = await Database.queryOne(`
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
  try {
    // Verify authentication
    const user = await AuthUtils.getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
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
- Recent Comments: ${issueDetails.recent_comments?.map((c: any) => `"${c.content}" - ${c.commenter_name}`).join(', ') || 'None'}`;
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

${platformStats.issuesByStatus.length > 0 ? `Issues by Status:
${platformStats.issuesByStatus.map(s => `- ${s.status}: ${s.count} issues`).join('\n')}` : 'No issues data available yet'}

${platformStats.issuesByCategory.length > 0 ? `Issues by Category (Most Common):
${platformStats.issuesByCategory.slice(0, 5).map(c => `- ${c.category}: ${c.count} issues`).join('\n')}` : 'No category data available yet'}

${platformStats.issuesByPriority.length > 0 ? `Issues by Priority:
${platformStats.issuesByPriority.map(p => `- ${p.priority}: ${p.count} issues`).join('\n')}` : 'No priority data available yet'}

${platformStats.issuesByLocation.length > 0 ? `Areas with Most Issues:
${platformStats.issuesByLocation.slice(0, 8).map(l => `- ${l.address}: ${l.count} issues`).join('\n')}` : 'No location data available yet'}

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

    return NextResponse.json({ 
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('SAFETY')) {
        return NextResponse.json(
          { error: 'Message content flagged for safety. Please rephrase your question.' },
          { status: 400 }
        );
      }
    }

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
    model: 'gemini-2.0-flash-exp',
    features: [
      'Platform guidance',
      'Issue reporting help',
      'Community engagement tips',
      'Feature explanations',
      'Civic participation advice'
    ]
  });
}
