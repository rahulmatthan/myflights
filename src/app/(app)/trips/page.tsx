import { auth } from '@/auth'
import { db } from '@/db'
import { trips } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CreateTripDialog from '@/components/create-trip-dialog'
import { Plane, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default async function TripsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const userTrips = await db.query.trips.findMany({
    where: eq(trips.userId, session.user.id),
    with: {
      flightLegs: {
        orderBy: (l, { asc }) => [asc(l.sequenceNumber)],
      },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <CreateTripDialog />
      </div>

      {userTrips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No trips yet</p>
          <p className="text-sm">Create your first trip to start tracking flights</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {userTrips.map(trip => {
            const firstLeg = trip.flightLegs[0]
            const lastLeg = trip.flightLegs[trip.flightLegs.length - 1]
            return (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{trip.name}</CardTitle>
                      {firstLeg && (
                        <Badge variant="outline">
                          {trip.flightLegs.length} flight{trip.flightLegs.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {firstLeg ? (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Plane className="h-4 w-4" />
                          <span>{firstLeg.originIata}</span>
                          <span>&rarr;</span>
                          <span>{lastLeg?.destinationIata ?? firstLeg.destinationIata}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(firstLeg.scheduledDeparture), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
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
