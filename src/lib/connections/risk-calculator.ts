import { differenceInMinutes } from 'date-fns'

export type ConnectionRisk = 'relaxed' | 'normal' | 'tight' | 'at_risk'

export interface Connection {
  inboundLegId: number
  outboundLegId: number
  inboundArrival: Date
  outboundDeparture: Date
  inboundDelay: number
  outboundDelay: number
  airportIata: string
}

export interface ConnectionRiskResult {
  risk: ConnectionRisk
  availableMinutes: number
  effectiveArrival: Date
  effectiveDeparture: Date
}

export function calculateConnectionRisk(conn: Connection): ConnectionRiskResult {
  const effectiveArrival = new Date(conn.inboundArrival.getTime() + conn.inboundDelay * 60000)
  const effectiveDeparture = new Date(conn.outboundDeparture.getTime() + conn.outboundDelay * 60000)
  const availableMinutes = differenceInMinutes(effectiveDeparture, effectiveArrival)

  let risk: ConnectionRisk
  if (availableMinutes > 90) risk = 'relaxed'
  else if (availableMinutes > 45) risk = 'normal'
  else if (availableMinutes > 20) risk = 'tight'
  else risk = 'at_risk'

  return { risk, availableMinutes, effectiveArrival, effectiveDeparture }
}
