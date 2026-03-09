import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = [
    'name',
    'notifyDelays', 'notifyGateChanges', 'notifyBoarding',
    'notifyCancellations', 'notifyInboundDelays', 'notifyConnectionRisk',
    'minDelayMinutes', 'color',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id))
  return NextResponse.json({ success: true })
}
