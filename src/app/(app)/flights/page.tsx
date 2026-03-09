import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { getDelegatorIds } from '@/lib/auth/delegate-check'
import FlightCard from '@/components/flight-card'
import AddFlightDialog from '@/components/add-flight-dialog'
import TodayFlights from '@/components/today-flights'
import { Plane } from 'lucide-react'
import { isToday, isFuture, startOfDay } from 'date-fns'

export default async function FlightsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

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

  const todayFlights = legs.filter(l => isToday(new Date(l.scheduledDeparture)))
  const upcomingFlights = legs.filter(l => {
    const dep = new Date(l.scheduledDeparture)
    return !isToday(dep) && isFuture(startOfDay(dep))
  })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Flights</h1>
        <AddFlightDialog />
      </div>

      <TodayFlights flights={todayFlights} />

      {legs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No flights yet</p>
          <p className="text-sm">Add your first flight to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingFlights.map(leg => (
            <FlightCard key={leg.id} leg={leg} />
          ))}
          {upcomingFlights.length === 0 && todayFlights.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No upcoming flights. Check <a href="/history" className="underline">History</a> for past flights.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
