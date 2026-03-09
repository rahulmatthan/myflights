import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { canManageFlightsFor } from '@/lib/auth/delegate-check'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ legId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { legId } = await params
  const legIdNum = parseInt(legId, 10)

  const leg = await db.query.flightLegs.findFirst({
    where: eq(flightLegs.id, legIdNum),
    with: { trip: { columns: { userId: true } } },
  })

  if (!leg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const travelerId = leg.travelerId ?? leg.trip.userId
  const allowed = await canManageFlightsFor(session.user.id, travelerId)
  if (!allowed && leg.trip.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(flightLegs).where(eq(flightLegs.id, legIdNum))

  return NextResponse.json({ success: true })
}
