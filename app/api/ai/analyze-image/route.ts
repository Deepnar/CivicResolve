import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { UserModel, OrganizationModel, UserOrganizationModel } from '@/lib/models'
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

    // Check if user is part of an organization (only org admins can use AI analysis)
    const organizationId = await UserModel.getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Only organization members can access AI analysis' },
        { status: 403 }
      )
    }

    // Check if user has admin role in organization
    const isAdmin = await UserOrganizationModel.isOrganizationAdmin(user.id, organizationId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can access AI analysis' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { imageData, issueId } = body

    console.log('AI Analysis Debug:')
    console.log('- Issue ID:', issueId)
    console.log('- Image data type:', typeof imageData)
    console.log('- Image data length:', imageData?.length)
    console.log('- Image data starts with data:', imageData?.startsWith('data:'))
    console.log('- First 100 chars:', imageData?.substring(0, 100))

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required for analysis' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'AI analysis service is not configured' },
        { status: 503 }
      )
    }

    console.log(`🤖 [AI ANALYSIS] Starting analysis for issue ${issueId || 'unknown'} by user ${user.id}`)

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

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
Analyze this civic issue image and provide detailed insights for municipal administration. 

IMPORTANT: Even if the image seems unclear, look for ANY potential civic issues. ALWAYS provide at least one issue even if it's a general observation based on what's visible. Never return empty arrays.

Please analyze the image for:
1. Primary civic issues visible (potholes, garbage, waterlogging, broken infrastructure, etc.)
2. Severity assessment (Minor, Moderate, Severe)
3. Priority level for repair (Low, Medium, High, Urgent)
4. Estimated resources needed (equipment, materials, personnel)
5. Safety concerns and public impact
6. Suggested immediate actions
7. Long-term prevention measures

Return the analysis in the following JSON format:
{
  "issues": [
    {
      "type": "specific issue type",
      "severity": "Minor|Moderate|Severe", 
      "priority": "Low|Medium|High|Urgent",
      "description": "detailed description of the issue"
    }
  ],
  "safety_concerns": "description of any safety risks",
  "public_impact": "assessment of impact on citizens",
  "resources_needed": {
    "equipment": ["list of equipment needed"],
    "materials": ["list of materials needed"],
    "estimated_cost": "cost estimate if possible",
    "estimated_time": "time estimate for resolution"
  },
  "immediate_actions": ["list of immediate actions needed"],
  "prevention_measures": ["list of preventive measures"],
  "recommended_category": "ROADS|WATER|WASTE|PARKS|LIGHTING|OTHER",
  "confidence_score": "percentage confidence in analysis"
}

Only return valid JSON, no additional text.
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

    console.log(`🤖 [AI ANALYSIS] Raw response: ${analysisText.substring(0, 200)}...`)

    // Parse the JSON response
    let analysis
    try {
      // Clean the response text to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('🚨 [AI ANALYSIS] Failed to parse JSON:', parseError)
      return NextResponse.json(
        { 
          error: 'Failed to parse AI analysis response',
          rawResponse: analysisText 
        },
        { status: 500 }
      )
    }

    // Add fallback data if AI returns empty results
    if (!analysis.issues || analysis.issues.length === 0) {
      analysis.issues = [{
        type: "General Infrastructure Assessment",
        severity: "Minor",
        priority: "Medium",
        description: "Image analyzed but specific issues require manual inspection to determine exact nature and scope."
      }];
    }

    if (!analysis.safety_concerns) {
      analysis.safety_concerns = "No immediate safety concerns visible from this image";
    }

    if (!analysis.public_impact) {
      analysis.public_impact = "Potential impact on public requires on-site assessment";
    }

    if (!analysis.resources_needed?.equipment || analysis.resources_needed.equipment.length === 0) {
      analysis.resources_needed = {
        equipment: ["Standard inspection tools", "Basic maintenance equipment"],
        materials: ["To be determined based on inspection"],
        estimated_cost: "Minimal to moderate cost expected",
        estimated_time: "1-3 days for assessment and resolution"
      };
    }

    if (!analysis.immediate_actions || analysis.immediate_actions.length === 0) {
      analysis.immediate_actions = ["Conduct on-site inspection", "Assess actual condition"];
    }

    if (!analysis.prevention_measures || analysis.prevention_measures.length === 0) {
      analysis.prevention_measures = ["Regular maintenance schedule", "Periodic inspections"];
    }

    if (!analysis.recommended_category) {
      analysis.recommended_category = "OTHER";
    }

    if (!analysis.confidence_score) {
      analysis.confidence_score = "60%";
    }

    console.log(`✅ [AI ANALYSIS] Analysis completed successfully for issue ${issueId || 'unknown'}`)

    return NextResponse.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 [AI ANALYSIS] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}