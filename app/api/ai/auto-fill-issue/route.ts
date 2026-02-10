import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageData } = body

    console.log('AI Auto-fill Debug:')
    console.log('- User ID:', user.id)
    console.log('- Image data type:', typeof imageData)
    console.log('- Image data length:', imageData?.length)
    console.log('- Image data starts with data:', imageData?.startsWith('data:'))

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required for auto-fill' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      )
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    console.log(`🤖 [AUTO-FILL] Starting auto-fill for user ${user.id}`)

    // Convert base64 image data to the format expected by Gemini
    let imageBase64 = imageData
    let mimeType = 'image/jpeg'

    // Handle data URL format (data:image/jpeg;base64,...)
    if (imageData.startsWith('data:')) {
      const [header, base64Data] = imageData.split(',')
      imageBase64 = base64Data
      mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg'
      console.log('- Extracted mime type:', mimeType)
      console.log('- Base64 data length after extraction:', imageBase64?.length)
    } else {
      console.log('- Image data does not start with data: URL, using as-is')
    }

    const prompt = `
You are an expert in civic infrastructure issues. Analyze this image and create a clear, concise issue report for citizens to submit to municipal authorities. Do not ask for any additional information or do not leave any input fields for the user to add.

Generate a title and description that a citizen would write when reporting this issue. Focus on:
- What they can see in the image
- The location/area type (road, sidewalk, park, etc.)
- The specific problem (damage, safety concern, maintenance needed)
- Impact on daily life
- DO NOT ASK USER TO INPUT ANYTHING INSIDE IT SUCH AS "LOCATION" OR "CATEGORY" OR ANYTHING LIKE [insert location details if known, e.g., the intersection of Elm Street].

Keep the language simple, direct, and citizen-friendly. Avoid technical jargon.

Respond ONLY with valid JSON in this exact format:
{
  "title": "A clear, descriptive title (5-50 words)",
  "description": "A detailed but concise description of the issue (20-200 words)",
  "confidence": "percentage confidence (e.g., '85%')"
}

Make sure the title is specific but not too technical. The description should explain what's wrong and why it needs attention.
`

    // Analyze the image with Gemini
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ])

    const response = await result.response
    const analysisText = response.text()

    console.log(`🤖 [AUTO-FILL] Raw response: ${analysisText.substring(0, 200)}...`)

    // Parse the JSON response
    let autoFillData
    try {
      // Clean the response text to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        autoFillData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('🚨 [AUTO-FILL] Failed to parse JSON:', parseError)
      return NextResponse.json(
        { 
          error: 'Failed to parse AI auto-fill response',
          rawResponse: analysisText 
        },
        { status: 500 }
      )
    }

    // Add fallback data if AI returns incomplete results
    if (!autoFillData.title) {
      autoFillData.title = "Infrastructure Issue Reported"
    }

    if (!autoFillData.description) {
      autoFillData.description = "An infrastructure issue has been identified in this location that requires municipal attention and assessment."
    }

    if (!autoFillData.confidence) {
      autoFillData.confidence = "70%"
    }

    console.log(`✅ [AUTO-FILL] Auto-fill completed successfully for user ${user.id}`)

    return NextResponse.json({
      success: true,
      autoFill: autoFillData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 [AUTO-FILL] Error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-fill issue details' },
      { status: 500 }
    )
  }
}
