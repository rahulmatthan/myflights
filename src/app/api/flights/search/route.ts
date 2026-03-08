import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { flightAware } from '@/lib/flight-data'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const flightNumber = searchParams.get('flight')
  const date = searchParams.get('date')

  if (!flightNumber || !date) {
    return NextResponse.json({ error: 'Missing flight or date parameter' }, { status: 400 })
  }

  // FlightAware Personal tier only supports up to 2 days in the future
  const searchDate = new Date(date)
  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  if (searchDate > twoDaysFromNow) {
    return NextResponse.json(
      { error: 'Flight lookup is only available within 2 days. Enter flight details manually for future flights.', code: 'TOO_FAR_FUTURE' },
      { status: 422 }
    )
  }

  const flightInfo = await flightAware.getFlightStatus(flightNumber, date)
  if (!flightInfo) {
    return NextResponse.json({ error: 'Flight not found. Check the flight number and date.' }, { status: 404 })
  }

  return NextResponse.json(flightInfo)
}
