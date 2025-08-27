import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthUtils } from '@/lib/auth-utils';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // For now, let's make this work without auth to test the AI integration
    // TODO: Re-enable authentication once we confirm AI is working
    // const user = await AuthUtils.getCurrentUser(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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

    // Get the generative model - using Gemini 2.0 Flash for faster responses
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Create a comprehensive prompt for CivicResolve context
    const systemPrompt = `You are an intelligent assistant for CivicResolve, a civic engagement platform that helps citizens report and track community issues. Your role is to:

1. Help users understand how to use the platform effectively
2. Provide guidance on reporting civic issues (potholes, broken streetlights, graffiti, etc.)
3. Explain the issue resolution process
4. Offer tips for community engagement
5. Answer questions about local governance and civic participation
6. Help with navigation and feature explanations

Key features of CivicResolve:
- Issue reporting with photos and location data
- Real-time tracking of issue status
- Community voting and commenting on issues
- Analytics dashboard for administrators
- User profiles and engagement tracking
- Geographic mapping of issues

Guidelines:
- Be helpful, friendly, and informative
- Focus on civic engagement and community improvement
- Provide actionable advice when possible
- If you don't know something specific about the platform, be honest
- Encourage constructive community participation
- Keep responses concise but comprehensive
- Use clear formatting with bullet points and bold text for emphasis
- Use **bold** for important terms and concepts
- Use bullet points (-) for lists and steps
- Keep paragraphs short and readable

User Context: ${context ? JSON.stringify(context) : 'General inquiry'}

User Message: ${message}

Please provide a helpful response with clear formatting:`;

    // Generate response
    const result = await model.generateContent(systemPrompt);
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
