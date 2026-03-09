import { format, differenceInMinutes } from 'date-fns'
import { Plane, Clock, MapPin } from 'lucide-react'
import { colorBg, colorCardBg, colorCardBorder } from '@/lib/user-colors'

interface TodayFlight {
  id: number
  flightNumber: string
  originIata: string
  destinationIata: string
  scheduledDeparture: Date | string
  scheduledArrival: Date | string
  estimatedDeparture?: Date | string | null
  estimatedArrival?: Date | string | null
  actualDeparture?: Date | string | null
  actualArrival?: Date | string | null
  status: string
  delayMinutes?: number | null
  gateDeparture?: string | null
  gateArrival?: string | null
  terminalArrival?: string | null
  traveler?: { name: string | null; color: string | null } | null
}

function getPickupStatus(flight: TodayFlight): { label: string; sublabel: string; urgent: boolean } {
  const now = new Date()
  const effectiveArr = flight.actualArrival || flight.estimatedArrival || flight.scheduledArrival
  const arrDate = new Date(effectiveArr)
  const minsToLand = differenceInMinutes(arrDate, now)

  if (flight.status === 'arrived') {
    return { label: 'Arrived', sublabel: `at ${format(arrDate, 'HH:mm')}`, urgent: false }
  }
  if (flight.status === 'in_air') {
    if (minsToLand <= 30) return { label: 'Landing soon', sublabel: `~${minsToLand} min`, urgent: true }
    return { label: 'In the air', sublabel: `lands ${format(arrDate, 'HH:mm')}`, urgent: false }
  }
  if (flight.status === 'boarding') {
    return { label: 'Boarding', sublabel: `dep ${format(new Date(flight.scheduledDeparture), 'HH:mm')}`, urgent: false }
  }
  if (flight.status === 'cancelled') {
    return { label: 'Cancelled', sublabel: 'Check alternative', urgent: true }
  }
  const depDate = new Date(flight.estimatedDeparture || flight.scheduledDeparture)
  const minsToDep = differenceInMinutes(depDate, now)
  if (minsToDep <= 0) return { label: 'Departed', sublabel: `lands ${format(arrDate, 'HH:mm')}`, urgent: false }
  if (minsToDep <= 60) return { label: `Departs in ${minsToDep}m`, sublabel: `lands ${format(arrDate, 'HH:mm')}`, urgent: false }
  return { label: `Departs ${format(depDate, 'HH:mm')}`, sublabel: `lands ${format(arrDate, 'HH:mm')}`, urgent: false }
}

export default function TodayFlights({ flights }: { flights: TodayFlight[] }) {
  if (flights.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Today&apos;s flights</h2>
      </div>
      <div className="space-y-2">
        {flights.map(flight => {
          const status = getPickupStatus(flight)
          const color = flight.traveler?.color
          return (
            <div
              key={flight.id}
              className={`rounded-lg border-l-4 p-3 ${colorCardBorder(color)} ${colorCardBg(color)} ${status.urgent ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colorBg(color)}`} />
                  <span className="font-semibold text-sm">{flight.traveler?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">{flight.flightNumber}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${status.urgent ? 'text-yellow-600' : ''}`}>{status.label}</div>
                  <div className="text-xs text-muted-foreground">{status.sublabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Plane className="h-3 w-3" />
                <span className="font-medium">{flight.originIata}</span>
                <span>→</span>
                <span className="font-medium">{flight.destinationIata}</span>
                {flight.gateArrival && (
                  <>
                    <MapPin className="h-3 w-3 ml-1" />
                    <span>Gate {flight.gateArrival}{flight.terminalArrival ? ` · T${flight.terminalArrival}` : ''}</span>
                  </>
                )}
                {(flight.delayMinutes ?? 0) >= 15 && (
                  <span className="ml-auto text-yellow-600 font-medium">+{flight.delayMinutes}m delay</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
