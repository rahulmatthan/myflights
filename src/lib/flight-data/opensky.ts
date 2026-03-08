import type { AircraftPosition, FlightDataProvider, FlightInfo, FlightLeg, AirportDelay } from './types'

const OPENSKY_BASE = 'https://opensky-network.org/api'

export class OpenSkyProvider implements FlightDataProvider {
  async getFlightStatus(_flightNumber: string, _date: string): Promise<FlightInfo | null> {
    // OpenSky doesn't provide schedule data — use as position supplement only
    return null
  }

  async getAircraftRotation(_registration: string, _date: string): Promise<FlightLeg[]> {
    return []
  }

  async getAirportDelays(_airportCode: string): Promise<AirportDelay[]> {
    return []
  }

  async getAircraftPosition(registration: string): Promise<AircraftPosition | null> {
    try {
      // OpenSky uses ICAO24 hex code, not N-number registration
      // This is a best-effort lookup
      const res = await fetch(
        `${OPENSKY_BASE}/states/all?icao24=${registration.toLowerCase()}`,
        {
          headers: process.env.OPENSKY_USERNAME
            ? {
                Authorization:
                  'Basic ' +
                  Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64'),
              }
            : {},
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      const state = data.states?.[0]
      if (!state) return null

      return {
        registration,
        latitude: state[6],
        longitude: state[5],
        altitude: state[7],
        heading: state[10],
        groundSpeed: state[9],
        timestamp: new Date(state[3] * 1000),
      }
    } catch {
      return null
    }
  }
}
