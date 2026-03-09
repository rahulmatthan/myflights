import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { flightAware } from '@/lib/flight-data'
import { format } from 'date-fns'

export async function GET(
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
  if (!leg.aircraftRegistration) {
    return NextResponse.json({ error: 'No aircraft assigned yet' }, { status: 404 })
  }

  const date = format(new Date(leg.scheduledDeparture), 'yyyy-MM-dd')
  const rotation = await flightAware.getAircraftRotation(leg.aircraftRegistration, date)

  if (rotation.length === 0) {
    // Check if flight is beyond the 2-day window
    const departureDate = new Date(leg.scheduledDeparture)
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    const isFuture = departureDate > twoDaysFromNow

    return NextResponse.json({
      error: isFuture
        ? `Rotation data not available yet — flight is more than 2 days away. Check back closer to departure.`
        : `No rotation found for ${leg.aircraftRegistration} on ${date}. The aircraft may not have been assigned yet.`,
      aircraftRegistration: leg.aircraftRegistration,
    }, { status: 404 })
  }

  // Find where the user's flight sits in the rotation
  const userFlightIndex = rotation.findIndex(
    r => r.flightNumber === leg.flightNumber ||
      (r.originIata === leg.originIata && r.destinationIata === leg.destinationIata)
  )

  // Return up to 7 flights leading up to (and including) the user's flight
  const start = Math.max(0, userFlightIndex === -1 ? rotation.length - 7 : userFlightIndex - 6)
  const end = userFlightIndex === -1 ? rotation.length : userFlightIndex + 1
  const relevantFlights = rotation.slice(start, end)

  return NextResponse.json({
    rotation: relevantFlights,
    userFlightIndex: userFlightIndex - start,
    aircraftRegistration: leg.aircraftRegistration,
    totalRotationLegs: rotation.length,
  })
}
