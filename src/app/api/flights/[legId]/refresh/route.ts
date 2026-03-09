import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs, trips, flightStatusHistory, inboundLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { flightAware } from '@/lib/flight-data'
import { getNextCheckAt } from '@/lib/monitor/scheduler'
import { format } from 'date-fns'
import { canManageFlightsFor } from '@/lib/auth/delegate-check'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ legId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { legId } = await params
  const legIdNum = parseInt(legId, 10)

  // Load leg and verify ownership via trip
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

  const date = format(new Date(leg.scheduledDeparture), 'yyyy-MM-dd')
  const newData = await flightAware.getFlightStatus(leg.flightNumber, date)

  if (!newData) {
    return NextResponse.json({ error: 'Could not fetch flight data' }, { status: 502 })
  }

  const now = new Date()
  const nextCheckAt = getNextCheckAt(newData.scheduledDeparture, newData.status, now)

  await db.update(flightLegs)
    .set({
      status: newData.status,
      delayMinutes: newData.delayMinutes,
      aircraftRegistration: newData.aircraftRegistration,
      aircraftType: newData.aircraftType,
      estimatedDeparture: newData.estimatedDeparture,
      estimatedArrival: newData.estimatedArrival,
      actualDeparture: newData.actualDeparture,
      actualArrival: newData.actualArrival,
      gateDeparture: newData.gateDeparture,
      gateArrival: newData.gateArrival,
      terminalDeparture: newData.terminalDeparture,
      terminalArrival: newData.terminalArrival,
      scheduledOff: newData.scheduledOff,
      estimatedOff: newData.estimatedOff,
      actualOff: newData.actualOff,
      scheduledOn: newData.scheduledOn,
      estimatedOn: newData.estimatedOn,
      actualOn: newData.actualOn,
      lastCheckedAt: now,
      nextCheckAt,
      updatedAt: now,
    })
    .where(eq(flightLegs.id, legIdNum))

  await db.insert(flightStatusHistory).values({
    flightLegId: legIdNum,
    recordedAt: now,
    status: newData.status,
    delayMinutes: newData.delayMinutes,
    gate: newData.gateDeparture,
    terminal: newData.terminalDeparture,
    estimatedDeparture: newData.estimatedDeparture,
    estimatedArrival: newData.estimatedArrival,
    source: 'flightaware',
  })

  // Detect inbound aircraft
  if (newData.aircraftRegistration) {
    const existingInbound = await db.query.inboundLegs.findFirst({
      where: eq(inboundLegs.flightLegId, legIdNum),
    })
    if (!existingInbound) {
      const rotation = await flightAware.getAircraftRotation(newData.aircraftRegistration, date)
      const inbound = rotation.find(r => r.destinationIata === leg.originIata)
      if (inbound) {
        await db.insert(inboundLegs).values({
          flightLegId: legIdNum,
          inboundFlightNumber: inbound.flightNumber,
          inboundAirline: inbound.airlineIata,
          inboundDate: date,
          inboundOriginIata: inbound.originIata,
          inboundStatus: inbound.status,
          inboundDelayMinutes: inbound.delayMinutes,
          inboundScheduledArrival: inbound.scheduledArrival,
        })
      }
    }
  }

  // Return updated leg with relations
  const updated = await db.query.flightLegs.findFirst({
    where: eq(flightLegs.id, legIdNum),
    with: {
      inboundLeg: true,
      statusHistory: { limit: 10, orderBy: (h, { desc }) => [desc(h.recordedAt)] },
    },
  })

  return NextResponse.json(updated)
}
