import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
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

  const { bookingCode, seat, pnr } = await request.json()
  await db.update(flightLegs)
    .set({
      bookingCode: bookingCode ?? leg.bookingCode,
      seat: seat ?? leg.seat,
      pnr: pnr ?? leg.pnr,
      updatedAt: new Date(),
    })
    .where(eq(flightLegs.id, legIdNum))

  return NextResponse.json({ success: true })
}
