import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db } from '@/lib/database'

const MAX = 50

// GET /api/admin/candidates — AI-discovered issues awaiting review
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db.query<Record<string, unknown>[]>(
    `SELECT id, title, description, category, status, priority, latitude, longitude, address,
            image_url, discovery_class, discovery_confidence, discovery_source, created_at
     FROM issues
     WHERE status = 'CANDIDATE'
     ORDER BY created_at DESC
     LIMIT ${MAX}`
  )

  return NextResponse.json({
    candidates: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      priority: r.priority,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      address: r.address,
      imageUrl: r.image_url,
      discoveryClass: r.discovery_class,
      discoveryConfidence: r.discovery_confidence,
      discoverySource: r.discovery_source,
      createdAt: new Date(r.created_at as string),
    })),
  })
}
