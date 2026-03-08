import type { FlightInfo, FlightLeg, AirportDelay, AircraftPosition, FlightDataProvider, FlightStatus } from './types'

const BASE_URL = 'https://aeroapi.flightaware.com/aeroapi'

function getHeaders() {
  return {
    'x-apikey': process.env.FLIGHTAWARE_API_KEY!,
    'Accept': 'application/json',
  }
}

async function faFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: getHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FlightAware API error ${res.status}: ${text}`)
  }
  return res.json()
}

function mapStatus(faStatus: string): FlightStatus {
  const map: Record<string, FlightStatus> = {
    'Scheduled': 'scheduled',
    'En Route': 'in_air',
    'Landed': 'arrived',
    'Cancelled': 'cancelled',
    'Diverted': 'diverted',
    'Blocked': 'scheduled',
  }
  return map[faStatus] ?? 'unknown'
}

function parseDate(s?: string): Date | undefined {
  if (!s) return undefined
  return new Date(s)
}

export class FlightAwareProvider implements FlightDataProvider {
  async getFlightStatus(flightNumber: string, date: string): Promise<FlightInfo | null> {
    try {
      // Parse date as local noon to avoid UTC timezone shifting the day
      const startDate = new Date(`${date}T00:00:00Z`)
      const endDate = new Date(`${date}T23:59:59Z`)

      const data = await faFetch(
        `/flights/${encodeURIComponent(flightNumber)}?start=${startDate.toISOString()}&end=${endDate.toISOString()}&max_pages=1`
      )

      const flight = data.flights?.[0]
      if (!flight) return null

      const scheduledOut = parseDate(flight.scheduled_out)
      const scheduledIn = parseDate(flight.scheduled_in)
      if (!scheduledOut || !scheduledIn) return null

      const estimatedOut = parseDate(flight.estimated_out)
      const actualOut = parseDate(flight.actual_out)
      const estimatedIn = parseDate(flight.estimated_in)
      const actualIn = parseDate(flight.actual_in)

      // Calculate delay
      const effectiveDep = actualOut || estimatedOut || scheduledOut
      const delayMinutes = Math.max(0, Math.round((effectiveDep.getTime() - scheduledOut.getTime()) / 60000))

      return {
        flightNumber: flight.ident_iata ?? flightNumber,
        airlineIata: flight.operator_iata ?? flightNumber.slice(0, 2),
        originIata: flight.origin?.code_iata ?? '',
        destinationIata: flight.destination?.code_iata ?? '',
        scheduledDeparture: scheduledOut,
        scheduledArrival: scheduledIn,
        estimatedDeparture: estimatedOut,
        estimatedArrival: estimatedIn,
        actualDeparture: actualOut,
        actualArrival: actualIn,
        status: mapStatus(flight.status),
        delayMinutes,
        aircraftRegistration: flight.registration,
        aircraftType: flight.aircraft_type,
        gateDeparture: flight.gate_origin,
        gateArrival: flight.gate_destination,
        terminalDeparture: flight.terminal_origin,
        terminalArrival: flight.terminal_destination,
      }
    } catch (err) {
      console.error('FlightAware getFlightStatus error:', err)
      return null
    }
  }

  async getAircraftRotation(registration: string, date: string): Promise<FlightLeg[]> {
    try {
      const startDate = new Date(`${date}T00:00:00Z`)
      const endDate = new Date(`${date}T23:59:59Z`)

      const data = await faFetch(
        `/aircraft/${encodeURIComponent(registration)}/flights?start=${startDate.toISOString()}&end=${endDate.toISOString()}&max_pages=1`
      )

      return (data.flights ?? []).map((f: Record<string, unknown>) => ({
        flightNumber: f.ident_iata as string ?? f.ident as string,
        airlineIata: f.operator_iata as string ?? '',
        originIata: (f.origin as Record<string, unknown>)?.code_iata as string ?? '',
        destinationIata: (f.destination as Record<string, unknown>)?.code_iata as string ?? '',
        scheduledDeparture: new Date(f.scheduled_out as string),
        scheduledArrival: new Date(f.scheduled_in as string),
        status: mapStatus(f.status as string),
        delayMinutes: 0,
      }))
    } catch (err) {
      console.error('FlightAware getAircraftRotation error:', err)
      return []
    }
  }

  async getAirportDelays(airportCode: string): Promise<AirportDelay[]> {
    try {
      const data = await faFetch(`/airports/${encodeURIComponent(airportCode)}/delays`)
      if (!data.delays) return []
      return data.delays.map((d: Record<string, unknown>) => ({
        airportIata: airportCode,
        delayType: (d.category as string) ?? 'other',
        reason: (d.reason as string) ?? '',
        avgDelayMinutes: (d.avg_delay as number) ?? 0,
      }))
    } catch {
      return []
    }
  }

  async getAircraftPosition(registration: string): Promise<AircraftPosition | null> {
    try {
      const data = await faFetch(`/aircraft/${encodeURIComponent(registration)}/last_track`)
      const pos = data.positions?.[data.positions.length - 1]
      if (!pos) return null
      return {
        registration,
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        heading: pos.heading,
        groundSpeed: pos.groundspeed,
        timestamp: new Date(pos.timestamp),
      }
    } catch {
      return null
    }
  }
}
