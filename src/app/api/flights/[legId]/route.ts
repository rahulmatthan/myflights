import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs, trips } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

  if (!leg || leg.trip.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(flightLegs).where(eq(flightLegs.id, legIdNum))

  return NextResponse.json({ success: true })
}
