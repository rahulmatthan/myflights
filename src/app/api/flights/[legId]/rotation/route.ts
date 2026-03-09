import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { subDays, format } from 'date-fns'

const BASE_URL = 'https://aeroapi.flightaware.com/aeroapi'

function getHeaders() {
  return {
    'x-apikey': process.env.FLIGHTAWARE_API_KEY!,
    'Accept': 'application/json',
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ legId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { legId } = await params
  const legIdNum = parseInt(legId, 10)

  const leg = await db.query.flightLegs.findFirst({
    where: eq(flightLegs.id, legIdNum),
    with: { trip: { columns: { userId: true } } },
  })
  if (!leg || leg.trip.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch last 5 operations of this flight number (ending on the flight's date)
  const flightDate = new Date(leg.scheduledDeparture)
  const end = new Date(`${format(flightDate, 'yyyy-MM-dd')}T23:59:59Z`)
  const start = new Date(`${format(subDays(flightDate, 5), 'yyyy-MM-dd')}T00:00:00Z`)

  const url = `${BASE_URL}/flights/${encodeURIComponent(leg.flightNumber)}?start=${start.toISOString()}&end=${end.toISOString()}&max_pages=1`

  try {
    const res = await fetch(url, { headers: getHeaders() })
    if (!res.ok) {
      const text = await res.text()
      console.error('FlightAware history error:', res.status, text)
      return NextResponse.json({ error: 'Could not fetch flight history from FlightAware' }, { status: 502 })
    }

    const data = await res.json()
    const flights: Array<Record<string, unknown>> = data.flights ?? []

    if (flights.length === 0) {
      return NextResponse.json({ error: 'No recent history found for this flight number.' }, { status: 404 })
    }

    // Map to a clean shape, most recent first
    const history = flights
      .map(f => {
        const scheduledOut = f.scheduled_out as string | undefined
        const actualOut = f.actual_out as string | undefined
        const estimatedOut = f.estimated_out as string | undefined
        const scheduledIn = f.scheduled_in as string | undefined
        const actualIn = f.actual_in as string | undefined

        const scheduledOutDate = scheduledOut ? new Date(scheduledOut) : null
        const effectiveOut = actualOut || estimatedOut || scheduledOut
        const effectiveOutDate = effectiveOut ? new Date(effectiveOut) : null

        const delayMinutes = scheduledOutDate && effectiveOutDate
          ? Math.max(0, Math.round((effectiveOutDate.getTime() - scheduledOutDate.getTime()) / 60000))
          : 0

        const origin = f.origin as Record<string, unknown> | undefined
        const destination = f.destination as Record<string, unknown> | undefined

        return {
          date: scheduledOut ? format(new Date(scheduledOut), 'EEE MMM d') : '—',
          originIata: origin?.code_iata as string ?? '—',
          destinationIata: destination?.code_iata as string ?? '—',
          scheduledDeparture: scheduledOut ?? null,
          actualDeparture: actualOut ?? null,
          scheduledArrival: scheduledIn ?? null,
          actualArrival: actualIn ?? null,
          status: f.status as string ?? 'unknown',
          delayMinutes,
          cancelled: (f.status as string)?.toLowerCase().includes('cancel') ?? false,
        }
      })
      .reverse() // oldest first so it reads like a timeline

    // Mark which entry is the user's actual flight
    const userFlightDate = format(flightDate, 'yyyy-MM-dd')
    const userIndex = history.findIndex(h =>
      h.scheduledDeparture && format(new Date(h.scheduledDeparture), 'yyyy-MM-dd') === userFlightDate
    )

    return NextResponse.json({
      flightNumber: leg.flightNumber,
      history,
      userIndex,
    })
  } catch (err) {
    console.error('Flight history error:', err)
    return NextResponse.json({ error: 'Failed to fetch flight history' }, { status: 500 })
  }
}
