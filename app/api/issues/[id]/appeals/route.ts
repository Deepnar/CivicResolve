import { NextRequest, NextResponse } from 'next/server'
import { AppealModel } from '@/lib/models'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const issueId = parseInt(params.id)

    if (isNaN(issueId)) {
      return NextResponse.json(
        { error: 'Invalid issue ID' },
        { status: 400 }
      )
    }

    // Get all appeals for this issue
    const appeals = await AppealModel.findByIssueId(issueId)

    return NextResponse.json({
      appeals
    }, { status: 200 })

  } catch (error) {
    console.error('Error fetching appeals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}