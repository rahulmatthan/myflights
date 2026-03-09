export type FlightStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'in_air'
  | 'arrived'
  | 'cancelled'
  | 'diverted'
  | 'delayed'
  | 'unknown'

export interface FlightInfo {
  flightNumber: string
  airlineIata: string
  originIata: string
  destinationIata: string
  scheduledDeparture: Date
  scheduledArrival: Date
  estimatedDeparture?: Date
  estimatedArrival?: Date
  actualDeparture?: Date
  actualArrival?: Date
  status: FlightStatus
  delayMinutes: number
  aircraftRegistration?: string
  aircraftType?: string
  gateDeparture?: string
  gateArrival?: string
  terminalDeparture?: string
  terminalArrival?: string
  scheduledOff?: Date
  estimatedOff?: Date
  actualOff?: Date
  scheduledOn?: Date
  estimatedOn?: Date
  actualOn?: Date
}

export interface FlightLeg {
  flightNumber: string
  airlineIata: string
  originIata: string
  destinationIata: string
  scheduledDeparture: Date
  scheduledArrival: Date
  status: FlightStatus
  delayMinutes: number
}

export interface AirportDelay {
  airportIata: string
  delayType: 'GDP' | 'ground_stop' | 'EDCT' | 'miles_in_trail' | 'other'
  reason: string
  avgDelayMinutes: number
  expiresAt?: Date
}

export interface AircraftPosition {
  registration: string
  latitude: number
  longitude: number
  altitude: number
  heading: number
  groundSpeed: number
  timestamp: Date
}

export interface FlightDataProvider {
  getFlightStatus(flightNumber: string, date: string): Promise<FlightInfo | null>
  getAircraftRotation(registration: string, date: string): Promise<FlightLeg[]>
  getAirportDelays(airportCode: string): Promise<AirportDelay[]>
  getAircraftPosition(registration: string): Promise<AircraftPosition | null>
}
