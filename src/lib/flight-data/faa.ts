import type { AirportDelay } from './types'

const FAA_URL = 'https://nasstatus.faa.gov/api/airport-status-information'

interface FAAProgram {
  'Airport-ID'?: string
  Type?: string
  'Reason'?: string
  'Avg-Delay'?: string
  'Expiration-Time'?: string
}

export async function fetchFAADelays(): Promise<AirportDelay[]> {
  try {
    const res = await fetch(FAA_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()

    const delays: AirportDelay[] = []
    const programs: FAAProgram[] = data?.['Airport-Status-Information']?.Programs?.Program ?? []

    for (const p of programs) {
      if (!p['Airport-ID']) continue
      delays.push({
        airportIata: p['Airport-ID'],
        delayType: mapFAAType(p.Type ?? ''),
        reason: p['Reason'] ?? '',
        avgDelayMinutes: parseInt(p['Avg-Delay'] ?? '0', 10) || 0,
        expiresAt: p['Expiration-Time'] ? new Date(p['Expiration-Time']) : undefined,
      })
    }
    return delays
  } catch (err) {
    console.error('FAA NASSTATUS fetch error:', err)
    return []
  }
}

function mapFAAType(type: string): AirportDelay['delayType'] {
  if (type.includes('Ground Stop')) return 'ground_stop'
  if (type.includes('GDP') || type.includes('Ground Delay')) return 'GDP'
  if (type.includes('EDCT')) return 'EDCT'
  if (type.includes('Miles in Trail')) return 'miles_in_trail'
  return 'other'
}
