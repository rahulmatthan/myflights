import { db } from '@/db'
import { flightLegs, flightStatusHistory, inboundLegs } from '@/db/schema'
import { eq, lte, ne, and } from 'drizzle-orm'
import { flightAware } from '@/lib/flight-data'
import { getNextCheckAt } from './scheduler'
import { format } from 'date-fns'
import { triggerNotifications } from '@/lib/notifications/rules'

export async function runMonitor() {
  const now = new Date()

  // Find all flight legs due for a check
  const dueFights = await db.query.flightLegs.findMany({
    where: and(
      lte(flightLegs.nextCheckAt, now),
      ne(flightLegs.status, 'arrived'),
      ne(flightLegs.status, 'cancelled')
    ),
    with: {
      trip: { columns: { userId: true } },
    },
  })

  console.log(`Monitor: ${dueFights.length} flights due for check`)

  for (const leg of dueFights) {
    try {
      await updateFlightLeg(leg, now)
    } catch (err) {
      console.error(`Monitor: error updating flight leg ${leg.id}:`, err)
    }
  }

  // Update airport delays every 15 minutes (use a separate cron or check timestamp)
  await updateAirportDelays()
}

async function updateFlightLeg(leg: typeof flightLegs.$inferSelect & { trip: { userId: string } }, now: Date) {
  const date = format(leg.scheduledDeparture, 'yyyy-MM-dd')
  const newData = await flightAware.getFlightStatus(leg.flightNumber, date)

  if (!newData) {
    // Couldn't fetch — schedule next check anyway
    const nextCheck = getNextCheckAt(leg.scheduledDeparture, leg.status, now)
    await db.update(flightLegs)
      .set({ lastCheckedAt: now, nextCheckAt: nextCheck })
      .where(eq(flightLegs.id, leg.id))
    return
  }

  const previousStatus = leg.status
  const previousDelay = leg.delayMinutes ?? 0
  const previousGate = leg.gateDeparture

  // Calculate next poll time
  const nextCheck = getNextCheckAt(newData.scheduledDeparture, newData.status, now)

  // Update the flight leg
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
      lastCheckedAt: now,
      nextCheckAt: nextCheck,
      updatedAt: now,
    })
    .where(eq(flightLegs.id, leg.id))

  // Write to history
  await db.insert(flightStatusHistory).values({
    flightLegId: leg.id,
    recordedAt: now,
    status: newData.status,
    delayMinutes: newData.delayMinutes,
    gate: newData.gateDeparture,
    terminal: newData.terminalDeparture,
    estimatedDeparture: newData.estimatedDeparture,
    estimatedArrival: newData.estimatedArrival,
    source: 'flightaware',
  })

  // If we now have a registration, check for inbound aircraft
  if (newData.aircraftRegistration) {
    await ensureInboundLeg(leg.id, newData.aircraftRegistration, leg.originIata, date)
  }

  // Trigger notifications for significant changes
  await triggerNotifications({
    userId: leg.trip.userId,
    flightLegId: leg.id,
    previousStatus,
    newStatus: newData.status,
    previousDelay,
    newDelay: newData.delayMinutes,
    previousGate,
    newGate: newData.gateDeparture,
    flightNumber: leg.flightNumber,
  })
}

async function ensureInboundLeg(flightLegId: number, registration: string, arrivalAirport: string, date: string) {
  // Check if we already have an inbound record
  const existing = await db.query.inboundLegs.findFirst({
    where: eq(inboundLegs.flightLegId, flightLegId),
  })
  if (existing) return

  // Get aircraft rotation for the day
  const rotation = await flightAware.getAircraftRotation(registration, date)

  // Find the leg that arrives at our departure airport
  const inbound = rotation.find(leg => leg.destinationIata === arrivalAirport)
  if (!inbound) return

  await db.insert(inboundLegs).values({
    flightLegId,
    inboundFlightNumber: inbound.flightNumber,
    inboundAirline: inbound.airlineIata,
    inboundDate: date,
    inboundOriginIata: inbound.originIata,
    inboundStatus: inbound.status,
    inboundDelayMinutes: inbound.delayMinutes,
    inboundScheduledArrival: inbound.scheduledArrival,
  })
}

async function updateAirportDelays() {
  const { fetchFAADelays } = await import('@/lib/flight-data/faa')
  const { airportDelays } = await import('@/db/schema')

  const delays = await fetchFAADelays()
  if (delays.length === 0) return

  // Clear old delays and insert fresh ones
  const now = new Date()
  for (const delay of delays) {
    await db.insert(airportDelays).values({
      airportIata: delay.airportIata,
      delayType: delay.delayType,
      reason: delay.reason,
      avgDelayMinutes: delay.avgDelayMinutes,
      expiresAt: delay.expiresAt,
      fetchedAt: now,
    })
  }
}
