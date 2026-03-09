import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { inArray, lt } from 'drizzle-orm'
import { getDelegatorIds } from '@/lib/auth/delegate-check'
import FlightCard from '@/components/flight-card'
import { History } from 'lucide-react'
import { format, startOfDay } from 'date-fns'

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const delegatorIds = await getDelegatorIds(session.user.id)
  const managedIds = [session.user.id, ...delegatorIds]

  const legs = await db.query.flightLegs.findMany({
    where: (l, { and }) => and(
      inArray(flightLegs.travelerId, managedIds),
      lt(flightLegs.scheduledDeparture, startOfDay(new Date()))
    ),
    with: {
      traveler: { columns: { id: true, name: true, color: true } },
      inboundLeg: true,
      statusHistory: {
        limit: 5,
        orderBy: (h, { desc }) => [desc(h.recordedAt)],
      },
    },
    orderBy: (l, { desc }) => [desc(l.scheduledDeparture)],
  })

  // Group by month
  const byMonth: Record<string, typeof legs> = {}
  for (const leg of legs) {
    const key = format(new Date(leg.scheduledDeparture), 'MMMM yyyy')
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(leg)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold">Flight History</h1>
        {legs.length > 0 && (
          <span className="text-sm text-muted-foreground">· {legs.length} flight{legs.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {legs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No past flights yet</p>
          <p className="text-sm">Completed flights will appear here</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byMonth).map(([month, monthLegs]) => (
            <section key={month}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                {month}
              </h2>
              <div className="space-y-3">
                {monthLegs.map(leg => (
                  <FlightCard key={leg.id} leg={leg} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
