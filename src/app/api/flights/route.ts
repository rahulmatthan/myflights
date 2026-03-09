import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs, trips } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getNextCheckAt } from '@/lib/monitor/scheduler'
import { canManageFlightsFor, getDelegatorIds } from '@/lib/auth/delegate-check'

const addFlightSchema = z.object({
  flightNumber: z.string().min(2).max(10),
  airlineIata: z.string().length(2),
  originIata: z.string().length(3),
  destinationIata: z.string().length(3),
  scheduledDeparture: z.string().datetime(),
  scheduledArrival: z.string().datetime(),
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

/** Find or create the default trip for a user */
async function getOrCreateDefaultTrip(userId: string): Promise<number> {
  const existing = await db.query.trips.findFirst({
    where: eq(trips.userId, userId),
    columns: { id: true },
  })
  if (existing) return existing.id

  const [newTrip] = await db.insert(trips).values({
    userId,
    name: '__default__',
  }).returning({ id: trips.id })
  return newTrip.id
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const delegatorIds = await getDelegatorIds(session.user.id)
  const managedIds = [session.user.id, ...delegatorIds]

  const legs = await db.query.flightLegs.findMany({
    where: inArray(flightLegs.travelerId, managedIds),
    with: {
      traveler: { columns: { id: true, name: true, color: true } },
      inboundLeg: true,
      statusHistory: {
        limit: 5,
        orderBy: (h, { desc }) => [desc(h.recordedAt)],
      },
    },
    orderBy: (l, { asc }) => [asc(l.scheduledDeparture)],
  })

  return NextResponse.json(legs)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = addFlightSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const travelerId = parsed.data.travelerId ?? session.user.id

  // Auth: must be the traveler or their delegate
  const allowed = await canManageFlightsFor(session.user.id, travelerId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Find or create the traveler's default trip
  const tripId = await getOrCreateDefaultTrip(travelerId)

  const scheduledDeparture = new Date(parsed.data.scheduledDeparture)
  const nextCheckAt = getNextCheckAt(scheduledDeparture, parsed.data.status ?? 'scheduled')

  const [leg] = await db.insert(flightLegs).values({
    tripId,
    sequenceNumber: 0,
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
    travelerId,
    nextCheckAt,
  }).returning()

  return NextResponse.json(leg, { status: 201 })
}
