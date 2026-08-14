import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db } from '@/lib/database'

// PATCH /api/admin/candidates/[id] — { action: 'accept' | 'reject' }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number((await params).id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 })
  }

  const targetStatus = action === 'accept' ? 'PENDING' : 'REJECTED'
  const result = await db.query<{ affectedRows?: number }>(
    `UPDATE issues SET status = ?, updated_at = NOW() WHERE id = ? AND status = 'CANDIDATE'`,
    [targetStatus, id]
  )
  const affected = (result as any)?.affectedRows ?? 0

  return NextResponse.json({ success: true, id, status: targetStatus, affected })
}
