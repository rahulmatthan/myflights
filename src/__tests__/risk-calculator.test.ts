import { describe, it, expect } from 'vitest'
import { calculateConnectionRisk } from '@/lib/connections/risk-calculator'

describe('calculateConnectionRisk', () => {
  const base = new Date('2026-03-08T12:00:00Z')
  const twoHoursLater = new Date(base.getTime() + 2 * 60 * 60 * 1000)

  it('returns relaxed for >90 min connection', () => {
    const result = calculateConnectionRisk({
      inboundLegId: 1,
      outboundLegId: 2,
      inboundArrival: base,
      outboundDeparture: twoHoursLater,
      inboundDelay: 0,
      outboundDelay: 0,
      airportIata: 'JFK',
    })
    expect(result.risk).toBe('relaxed')
    expect(result.availableMinutes).toBe(120)
  })

  it('returns at_risk when delay eats into connection', () => {
    const result = calculateConnectionRisk({
      inboundLegId: 1,
      outboundLegId: 2,
      inboundArrival: base,
      outboundDeparture: new Date(base.getTime() + 25 * 60 * 1000),
      inboundDelay: 20,
      outboundDelay: 0,
      airportIata: 'JFK',
    })
    expect(result.risk).toBe('at_risk')
  })
})
