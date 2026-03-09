import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs, trips } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getNextCheckAt } from '@/lib/monitor/scheduler'

const addLegSchema = z.object({
  flightNumber: z.string().min(2).max(10),
  airlineIata: z.string().length(2),
  originIata: z.string().length(3),
  destinationIata: z.string().length(3),
  scheduledDeparture: z.string().datetime(),
  scheduledArrival: z.string().datetime(),
  sequenceNumber: z.number().int().min(0).optional().default(0),
  // Optional enriched fields from API search
  status: z.string().optional(),
  aircraftType: z.string().optional(),
  aircraftRegistration: z.string().optional(),
  gateDeparture: z.string().optional(),
  gateArrival: z.string().optional(),
  terminalDeparture: z.string().optional(),
  terminalArrival: z.string().optional(),
  estimatedDeparture: z.string().datetime().optional(),
  estimatedArrival: z.string().datetime().optional(),
  delayMinutes: z.number().int().optional(),
  travelerId: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tripId } = await params
  const tripIdNum = parseInt(tripId, 10)

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripIdNum),
  })
  if (!trip || trip.userId !== session.user.id) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = addLegSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const scheduledDeparture = new Date(parsed.data.scheduledDeparture)
  const nextCheckAt = getNextCheckAt(scheduledDeparture, parsed.data.status ?? 'scheduled')

  const [leg] = await db.insert(flightLegs).values({
    tripId: tripIdNum,
    sequenceNumber: parsed.data.sequenceNumber,
    flightNumber: parsed.data.flightNumber,
    airlineIata: parsed.data.airlineIata,
    originIata: parsed.data.originIata,
    destinationIata: parsed.data.destinationIata,
    scheduledDeparture,
    scheduledArrival: new Date(parsed.data.scheduledArrival),
    status: parsed.data.status ?? 'scheduled',
    aircraftType: parsed.data.aircraftType,
    aircraftRegistration: parsed.data.aircraftRegistration,
    gateDeparture: parsed.data.gateDeparture,
    gateArrival: parsed.data.gateArrival,
    terminalDeparture: parsed.data.terminalDeparture,
    terminalArrival: parsed.data.terminalArrival,
    estimatedDeparture: parsed.data.estimatedDeparture ? new Date(parsed.data.estimatedDeparture) : undefined,
    estimatedArrival: parsed.data.estimatedArrival ? new Date(parsed.data.estimatedArrival) : undefined,
    delayMinutes: parsed.data.delayMinutes ?? 0,
    travelerId: parsed.data.travelerId ?? session.user.id,
    nextCheckAt,
  }).returning()

  return NextResponse.json(leg, { status: 201 })
}
