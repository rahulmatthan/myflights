import { auth } from '@/auth'
import { db } from '@/db'
import { trips } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import FlightCard from '@/components/flight-card'
import AddFlightDialog from '@/components/add-flight-dialog'
import ConnectionRiskBadge from '@/components/connection-risk-badge'
import { calculateConnectionRisk } from '@/lib/connections/risk-calculator'

export default async function TripDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const session = await auth()
  if (!session?.user?.id) return null

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, parseInt(tripId, 10)),
    with: {
      flightLegs: {
        orderBy: (l, { asc }) => [asc(l.sequenceNumber)],
        with: {
          traveler: { columns: { id: true, name: true, color: true } },
          inboundLeg: true,
          statusHistory: {
            limit: 5,
            orderBy: (h, { desc }) => [desc(h.recordedAt)],
          },
        },
      },
    },
  })

  if (!trip || trip.userId !== session.user.id) notFound()

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{trip.name}</h1>
        <AddFlightDialog tripId={trip.id} />
      </div>

      <div className="space-y-4">
        {trip.flightLegs.map((leg, index) => {
          const prevLeg = trip.flightLegs[index - 1]
          const connectionRisk = prevLeg
            ? calculateConnectionRisk({
                inboundLegId: prevLeg.id,
                outboundLegId: leg.id,
                inboundArrival: new Date(prevLeg.scheduledArrival),
                outboundDeparture: new Date(leg.scheduledDeparture),
                inboundDelay: prevLeg.delayMinutes ?? 0,
                outboundDelay: leg.delayMinutes ?? 0,
                airportIata: prevLeg.destinationIata,
              })
            : null

          return (
            <div key={leg.id}>
              {connectionRisk && (
                <div className="flex items-center gap-2 py-2 px-4 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <ConnectionRiskBadge
                    risk={connectionRisk.risk}
                    minutes={connectionRisk.availableMinutes}
                  />
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <FlightCard leg={leg} />
            </div>
          )
        })}

        {trip.flightLegs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No flights added yet. Add your first flight leg.</p>
          </div>
        )}
      </div>
    </div>
  )
}
