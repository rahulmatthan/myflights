'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plane, Clock, MapPin, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface FlightLeg {
  id: number
  flightNumber: string
  airlineIata: string
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
  aircraftRegistration?: string | null
  aircraftType?: string | null
  gateDeparture?: string | null
  gateArrival?: string | null
  terminalDeparture?: string | null
  terminalArrival?: string | null
  lastCheckedAt?: Date | string | null
  inboundLeg?: {
    inboundFlightNumber: string
    inboundOriginIata?: string | null
    inboundDelayMinutes?: number | null
    inboundStatus?: string | null
    inboundEstimatedArrival?: Date | string | null
    inboundScheduledArrival?: Date | string | null
  } | null
}

function statusColor(status: string) {
  switch (status) {
    case 'arrived': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'in_air': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'boarding': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'departed': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'diverted': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'delayed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}

function formatTime(d: Date | string | null | undefined) {
  if (!d) return null
  return format(new Date(d), 'HH:mm')
}

export default function FlightCard({ leg: initialLeg }: { leg: FlightLeg }) {
  const router = useRouter()
  const [leg, setLeg] = useState(initialLeg)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const scheduledDep = new Date(leg.scheduledDeparture)
  const scheduledArr = new Date(leg.scheduledArrival)
  const delay = leg.delayMinutes ?? 0
  const isDelayed = delay >= 15

  const effectiveDepTime = leg.actualDeparture
    ? formatTime(leg.actualDeparture)
    : leg.estimatedDeparture
    ? formatTime(leg.estimatedDeparture)
    : null

  const effectiveArrTime = leg.actualArrival
    ? formatTime(leg.actualArrival)
    : leg.estimatedArrival
    ? formatTime(leg.estimatedArrival)
    : null

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/flights/${leg.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    }
    setDeleting(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshError('')
    try {
      const res = await fetch(`/api/flights/${leg.id}/refresh`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setLeg(updated)
        router.refresh()
      } else if (res.status === 502) {
        setRefreshError('Flight data not available yet (outside 2-day window)')
      } else {
        setRefreshError('Refresh failed')
      }
    } catch {
      setRefreshError('Refresh failed')
    }
    setRefreshing(false)
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-semibold">{leg.flightNumber}</span>
            {leg.aircraftType && (
              <span className="text-xs text-muted-foreground">{leg.aircraftType}</span>
            )}
            {leg.aircraftRegistration && (
              <span className="text-xs text-muted-foreground">· {leg.aircraftRegistration}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(leg.status)}`}>
              {leg.status.replace(/_/g, ' ')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh flight status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Confirm'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                title="Delete flight"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center min-w-[60px]">
            <div className="text-2xl font-bold">{leg.originIata}</div>
            <div className="text-sm font-medium">{formatTime(leg.scheduledDeparture)}</div>
            {effectiveDepTime && effectiveDepTime !== formatTime(leg.scheduledDeparture) && (
              <div className={`text-xs ${isDelayed ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {leg.actualDeparture ? 'Actual' : 'Est.'} {effectiveDepTime}
              </div>
            )}
            {leg.terminalDeparture && (
              <div className="text-xs text-muted-foreground">Term. {leg.terminalDeparture}</div>
            )}
            {leg.gateDeparture && (
              <div className="text-xs text-muted-foreground">Gate {leg.gateDeparture}</div>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="text-center min-w-[60px]">
            <div className="text-2xl font-bold">{leg.destinationIata}</div>
            <div className="text-sm font-medium">{formatTime(leg.scheduledArrival)}</div>
            {effectiveArrTime && effectiveArrTime !== formatTime(leg.scheduledArrival) && (
              <div className={`text-xs ${isDelayed ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {leg.actualArrival ? 'Actual' : 'Est.'} {effectiveArrTime}
              </div>
            )}
            {leg.terminalArrival && (
              <div className="text-xs text-muted-foreground">Term. {leg.terminalArrival}</div>
            )}
            {leg.gateArrival && (
              <div className="text-xs text-muted-foreground">Gate {leg.gateArrival}</div>
            )}
          </div>
        </div>

        {/* Footer info row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(scheduledDep, 'MMM d, yyyy')}</span>
          </div>
          {isDelayed && (
            <div className="flex items-center gap-1 text-yellow-600 font-medium">
              <AlertTriangle className="h-3 w-3" />
              <span>{delay} min delay</span>
            </div>
          )}
          {leg.lastCheckedAt && (
            <div className="ml-auto">
              Updated {format(new Date(leg.lastCheckedAt), 'HH:mm')}
            </div>
          )}
        </div>

        {refreshError && (
          <p className="text-xs text-amber-600 mt-2">{refreshError}</p>
        )}

        {/* Inbound aircraft panel */}
        {leg.inboundLeg && (
          <div className={`mt-3 p-2 rounded border text-xs ${
            (leg.inboundLeg.inboundDelayMinutes ?? 0) > 0
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
              : 'bg-muted border-border text-muted-foreground'
          }`}>
            <div className="flex items-center gap-1">
              {(leg.inboundLeg.inboundDelayMinutes ?? 0) > 0 && <AlertTriangle className="h-3 w-3 shrink-0" />}
              <MapPin className="h-3 w-3 shrink-0" />
              <span>
                Inbound: <strong>{leg.inboundLeg.inboundFlightNumber}</strong> from {leg.inboundLeg.inboundOriginIata}
                {' · '}
                {leg.inboundLeg.inboundStatus?.replace(/_/g, ' ')}
                {(leg.inboundLeg.inboundDelayMinutes ?? 0) > 0 && (
                  <> · <strong>{leg.inboundLeg.inboundDelayMinutes} min late</strong> — your flight may be delayed</>
                )}
                {leg.inboundLeg.inboundScheduledArrival && (
                  <> · Arr. {formatTime(leg.inboundLeg.inboundScheduledArrival)}</>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
