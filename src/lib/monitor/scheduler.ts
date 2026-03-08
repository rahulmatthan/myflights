import { addMinutes, addHours, differenceInMinutes } from 'date-fns'

export type PollInterval =
  | '6h'
  | '2h'
  | '30m'
  | '15m'
  | '5m'
  | '2m'
  | '3m'
  | 'stop'

export function getPollInterval(
  scheduledDeparture: Date,
  status: string,
  now: Date = new Date()
): PollInterval {
  if (status === 'arrived' || status === 'cancelled') return 'stop'
  if (status === 'in_air') return '3m'

  const minutesUntilDeparture = differenceInMinutes(scheduledDeparture, now)

  if (minutesUntilDeparture > 7 * 24 * 60) return '6h'
  if (minutesUntilDeparture > 48 * 60) return '2h'
  if (minutesUntilDeparture > 24 * 60) return '30m'
  if (minutesUntilDeparture > 4 * 60) return '15m'
  if (minutesUntilDeparture > 60) return '5m'
  if (minutesUntilDeparture >= -10) return '2m'

  // Post-departure but not arrived yet
  if (minutesUntilDeparture > -5 * 60) return '3m'

  return 'stop'
}

export function getNextCheckAt(
  scheduledDeparture: Date,
  status: string,
  now: Date = new Date()
): Date | null {
  const interval = getPollInterval(scheduledDeparture, status, now)

  switch (interval) {
    case '6h': return addHours(now, 6)
    case '2h': return addHours(now, 2)
    case '30m': return addMinutes(now, 30)
    case '15m': return addMinutes(now, 15)
    case '5m': return addMinutes(now, 5)
    case '2m': return addMinutes(now, 2)
    case '3m': return addMinutes(now, 3)
    case 'stop': return null
  }
}
