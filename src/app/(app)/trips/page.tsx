import { auth } from '@/auth'
import { db } from '@/db'
import { trips } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CreateTripDialog from '@/components/create-trip-dialog'
import TodayFlights from '@/components/today-flights'
import { Plane } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { colorBg } from '@/lib/user-colors'

export default async function TripsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const userTrips = await db.query.trips.findMany({
    where: eq(trips.userId, session.user.id),
    with: {
      flightLegs: {
        orderBy: (l, { asc }) => [asc(l.sequenceNumber)],
        with: {
          traveler: { columns: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  // Extract today's flights across all trips
  const todayFlights = userTrips.flatMap(trip =>
    trip.flightLegs
      .filter(leg => isToday(new Date(leg.scheduledDeparture)))
      .map(leg => ({ ...leg, tripName: trip.name }))
  ).sort((a, b) =>
    new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime()
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Trips</h1>
        <CreateTripDialog />
      </div>

      <TodayFlights flights={todayFlights} />

      {userTrips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No trips yet</p>
          <p className="text-sm">Create your first trip to start tracking flights</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {userTrips.map(trip => {
            const firstLeg = trip.flightLegs[0]
            const lastLeg = trip.flightLegs[trip.flightLegs.length - 1]
            // Get unique travelers
            const travelers = trip.flightLegs
              .map(l => l.traveler)
              .filter((t, i, arr) => t && arr.findIndex(x => x?.id === t.id) === i)

            return (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer active:opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold">{trip.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {trip.flightLegs.length} flight{trip.flightLegs.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {firstLeg ? (
                      <>
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <span className="font-medium">{firstLeg.originIata}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{lastLeg?.destinationIata ?? firstLeg.destinationIata}</span>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(firstLeg.scheduledDeparture), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {travelers.length > 0 && (
                          <div className="flex items-center gap-1">
                            {travelers.map(t => t && (
                              <div key={t.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className={`w-2.5 h-2.5 rounded-full ${colorBg(t.color)}`} />
                                <span>{t.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No flights added yet</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
