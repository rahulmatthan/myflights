import { db } from '@/db'
import { airportDelays } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

export const revalidate = 300 // 5 minute cache

export default async function AirportsPage() {
  const delays = await db.query.airportDelays.findMany({
    orderBy: [desc(airportDelays.fetchedAt)],
    limit: 100,
  })

  const byAirport = delays.reduce<Record<string, typeof delays>>((acc, d) => {
    if (!acc[d.airportIata]) acc[d.airportIata] = []
    acc[d.airportIata].push(d)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Airport Delays</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Real-time FAA ground delay programs and ground stops. Data refreshed every 5 minutes.
      </p>

      {Object.keys(byAirport).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No active delays reported</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(byAirport).map(([iata, airportDelayList]) => (
            <Card key={iata}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">{iata}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {airportDelayList.map(d => (
                  <div key={d.id} className="flex items-start gap-2">
                    <Badge variant={d.delayType === 'ground_stop' ? 'destructive' : 'secondary'}>
                      {d.delayType.replace('_', ' ')}
                    </Badge>
                    <div className="text-sm">
                      <div>{d.reason}</div>
                      {(d.avgDelayMinutes ?? 0) > 0 && (
                        <div className="text-muted-foreground">Avg delay: {d.avgDelayMinutes} min</div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
