'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plane, Clock, AlertTriangle, RefreshCw, Trash2,
  ChevronDown, ChevronUp, MapPin, Edit2, Check, X
} from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import { colorCardBorder, colorCardBg, colorBg } from '@/lib/user-colors'

interface HistoryFlight {
  date: string
  originIata: string
  destinationIata: string
  scheduledDeparture: string | null
  actualDeparture: string | null
  scheduledArrival: string | null
  actualArrival: string | null
  status: string
  delayMinutes: number
  cancelled: boolean
}

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
  scheduledOff?: Date | string | null
  estimatedOff?: Date | string | null
  actualOff?: Date | string | null
  scheduledOn?: Date | string | null
  estimatedOn?: Date | string | null
  actualOn?: Date | string | null
  status: string
  delayMinutes?: number | null
  aircraftRegistration?: string | null
  aircraftType?: string | null
  gateDeparture?: string | null
  gateArrival?: string | null
  terminalDeparture?: string | null
  terminalArrival?: string | null
  lastCheckedAt?: Date | string | null
  bookingCode?: string | null
  seat?: string | null
  pnr?: string | null
  inboundLeg?: {
    inboundFlightNumber: string
    inboundOriginIata?: string | null
    inboundDelayMinutes?: number | null
    inboundStatus?: string | null
    inboundScheduledArrival?: Date | string | null
  } | null
  traveler?: { id: string; name: string | null; color: string | null } | null
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

function rotationStatusColor(status: string) {
  switch (status) {
    case 'arrived': return 'text-green-600'
    case 'in_air': return 'text-blue-600'
    case 'cancelled': return 'text-red-600'
    default: return 'text-muted-foreground'
  }
}

function fmt(d: Date | string | null | undefined, pattern = 'HH:mm') {
  if (!d) return '—'
  return format(new Date(d), pattern)
}

function effectiveTime(actual: Date | string | null | undefined, estimated: Date | string | null | undefined, scheduled: Date | string) {
  return actual || estimated || scheduled
}

function formatDuration(minutes: number) {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

// Inline editable field
function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="h-6 text-xs px-1 py-0"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus
        />
        <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-700">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => { setEditing(false); setDraft(value) }} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-xs font-medium">{value || <span className="text-muted-foreground italic">not set</span>}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true) }}
        className="text-muted-foreground hover:text-foreground ml-1"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    </div>
  )
}

// Timeline row component
function TimelineRow({ label, scheduled, estimated, actual, isKey = false }: {
  label: string
  scheduled?: Date | string | null
  estimated?: Date | string | null
  actual?: Date | string | null
  isKey?: boolean
}) {
  const effective = actual || estimated || scheduled
  const scheduledDate = scheduled ? new Date(scheduled) : null
  const effectiveDate = effective ? new Date(effective) : null
  const diff = scheduledDate && effectiveDate ? differenceInMinutes(effectiveDate, scheduledDate) : 0
  const isDelayed = diff > 5
  const isEarly = diff < -1

  return (
    <div className={`flex items-center justify-between py-1 ${isKey ? 'font-medium' : ''}`}>
      <span className={`text-xs ${isKey ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <div className="flex items-center gap-2 text-xs">
        {scheduledDate && (
          <span className="text-muted-foreground">{fmt(scheduledDate)}</span>
        )}
        {effectiveDate && effectiveDate !== scheduledDate && (
          <span className={isDelayed ? 'text-yellow-600 font-medium' : isEarly ? 'text-green-600 font-medium' : 'text-foreground font-medium'}>
            {fmt(effectiveDate)}
            {diff !== 0 && <span className="ml-1 text-xs">({diff > 0 ? '+' : ''}{diff}m)</span>}
          </span>
        )}
        {(!effectiveDate || effectiveDate === scheduledDate) && scheduledDate && (
          <span className="font-medium">{fmt(scheduledDate)}</span>
        )}
        {!scheduledDate && !effectiveDate && <span className="text-muted-foreground">—</span>}
        {actual && <span className="text-xs text-green-600 ml-1">✓</span>}
      </div>
    </div>
  )
}

export default function FlightCard({ leg: initialLeg }: { leg: FlightLeg }) {
  const router = useRouter()
  const [leg, setLeg] = useState(initialLeg)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showTimetable, setShowTimetable] = useState(false)
  const [showRotation, setShowRotation] = useState(false)
  const [history, setHistory] = useState<{ flightNumber: string; history: HistoryFlight[]; userIndex: number } | null>(null)
  const [loadingRotation, setLoadingRotation] = useState(false)
  const [rotationError, setRotationError] = useState('')

  const delay = leg.delayMinutes ?? 0
  const isDelayed = delay >= 15

  // Calculate air time and total time
  const gateOut = leg.actualDeparture || leg.estimatedDeparture || leg.scheduledDeparture
  const gateIn = leg.actualArrival || leg.estimatedArrival || leg.scheduledArrival
  const wheelsOff = leg.actualOff || leg.estimatedOff || leg.scheduledOff
  const wheelsOn = leg.actualOn || leg.estimatedOn || leg.scheduledOn

  const totalMinutes = gateOut && gateIn ? differenceInMinutes(new Date(gateIn), new Date(gateOut)) : null
  const airMinutes = wheelsOff && wheelsOn ? differenceInMinutes(new Date(wheelsOn), new Date(wheelsOff)) : null
  const taxiOutMinutes = gateOut && wheelsOff ? differenceInMinutes(new Date(wheelsOff), new Date(gateOut)) : null
  const taxiInMinutes = wheelsOn && gateIn ? differenceInMinutes(new Date(gateIn), new Date(wheelsOn)) : null

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/flights/${leg.id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    setDeleting(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshError('')
    try {
      const res = await fetch(`/api/flights/${leg.id}/refresh`, { method: 'POST' })
      if (res.ok) {
        setLeg(await res.json())
        router.refresh()
      } else if (res.status === 502) {
        setRefreshError('Live data not available yet (outside 2-day window)')
      } else {
        setRefreshError('Refresh failed')
      }
    } catch {
      setRefreshError('Refresh failed')
    }
    setRefreshing(false)
  }

  async function handleLoadRotation() {
    if (history) { setShowRotation(!showRotation); return }
    setLoadingRotation(true)
    setRotationError('')
    try {
      const res = await fetch(`/api/flights/${leg.id}/rotation`)
      if (res.ok) {
        setHistory(await res.json())
        setShowRotation(true)
      } else {
        const data = await res.json()
        setRotationError(data.error ?? 'Could not load flight history')
      }
    } catch {
      setRotationError('Could not load flight history')
    }
    setLoadingRotation(false)
  }

  async function saveBooking(field: 'bookingCode' | 'seat' | 'pnr', value: string) {
    await fetch(`/api/flights/${leg.id}/booking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    setLeg(prev => ({ ...prev, [field]: value }))
  }

  const effectiveDep = effectiveTime(leg.actualDeparture, leg.estimatedDeparture, leg.scheduledDeparture)
  const effectiveArr = effectiveTime(leg.actualArrival, leg.estimatedArrival, leg.scheduledArrival)

  return (
    <Card className={`border-l-4 ${colorCardBorder(leg.traveler?.color)} ${colorCardBg(leg.traveler?.color)}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Plane className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold">{leg.flightNumber}</span>
            {leg.aircraftType && <span className="text-xs text-muted-foreground">{leg.aircraftType}</span>}
            {leg.aircraftRegistration && <span className="text-xs text-muted-foreground">· {leg.aircraftRegistration}</span>}
            {leg.traveler && (
              <div className="flex items-center gap-1 ml-1">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorBg(leg.traveler.color)}`} />
                <span className="text-xs text-muted-foreground">{leg.traveler.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(leg.status)}`}>
              {leg.status.replace(/_/g, ' ')}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {confirmDelete ? (
              <>
                <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Confirm'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-3 mb-3">
          <div className="text-center min-w-[64px]">
            <div className="text-2xl font-bold">{leg.originIata}</div>
            <div className="text-sm font-semibold">{fmt(effectiveDep)}</div>
            {leg.actualDeparture && <div className="text-xs text-green-600">Actual</div>}
            {!leg.actualDeparture && leg.estimatedDeparture && isDelayed && <div className="text-xs text-yellow-600">Est.</div>}
            {leg.terminalDeparture && <div className="text-xs text-muted-foreground">T{leg.terminalDeparture}</div>}
            {leg.gateDeparture && <div className="text-xs text-muted-foreground">Gate {leg.gateDeparture}</div>}
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 w-full">
              <div className="flex-1 h-px bg-border" />
              <Plane className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1 h-px bg-border" />
            </div>
            {airMinutes && (
              <span className="text-xs text-muted-foreground">{formatDuration(airMinutes)} air</span>
            )}
            {totalMinutes && (
              <span className="text-xs text-muted-foreground">{formatDuration(totalMinutes)} total</span>
            )}
          </div>

          <div className="text-center min-w-[64px]">
            <div className="text-2xl font-bold">{leg.destinationIata}</div>
            <div className="text-sm font-semibold">{fmt(effectiveArr)}</div>
            {leg.actualArrival && <div className="text-xs text-green-600">Actual</div>}
            {!leg.actualArrival && leg.estimatedArrival && isDelayed && <div className="text-xs text-yellow-600">Est.</div>}
            {leg.terminalArrival && <div className="text-xs text-muted-foreground">T{leg.terminalArrival}</div>}
            {leg.gateArrival && <div className="text-xs text-muted-foreground">Gate {leg.gateArrival}</div>}
          </div>
        </div>

        {/* Date + delay row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{fmt(leg.scheduledDeparture, 'MMM d, yyyy')}</span>
          </div>
          {isDelayed && (
            <div className="flex items-center gap-1 text-yellow-600 font-medium">
              <AlertTriangle className="h-3 w-3" />
              <span>{delay} min delay</span>
            </div>
          )}
          {leg.lastCheckedAt && (
            <span className="ml-auto">Updated {fmt(leg.lastCheckedAt)}</span>
          )}
        </div>

        {refreshError && <p className="text-xs text-amber-600 mb-2">{refreshError}</p>}

        {/* Booking info */}
        <div className="border rounded-lg p-3 space-y-1 mb-3 bg-muted/30">
          <EditableField label="Booking ref" value={leg.bookingCode ?? ''} onSave={v => saveBooking('bookingCode', v)} />
          <EditableField label="Seat" value={leg.seat ?? ''} onSave={v => saveBooking('seat', v)} />
          <EditableField label="PNR" value={leg.pnr ?? ''} onSave={v => saveBooking('pnr', v)} />
        </div>

        {/* Inbound aircraft */}
        {leg.inboundLeg && (
          <div className={`mb-3 p-2 rounded border text-xs ${
            (leg.inboundLeg.inboundDelayMinutes ?? 0) > 0
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
              : 'bg-muted/30 border-border text-muted-foreground'
          }`}>
            <div className="flex items-center gap-1">
              {(leg.inboundLeg.inboundDelayMinutes ?? 0) > 0 && <AlertTriangle className="h-3 w-3 shrink-0" />}
              <MapPin className="h-3 w-3 shrink-0" />
              <span>
                Inbound: <strong>{leg.inboundLeg.inboundFlightNumber}</strong> from {leg.inboundLeg.inboundOriginIata}
                {' · '}{leg.inboundLeg.inboundStatus?.replace(/_/g, ' ')}
                {(leg.inboundLeg.inboundDelayMinutes ?? 0) > 0 && (
                  <> · <strong>{leg.inboundLeg.inboundDelayMinutes} min late</strong> — your flight may be delayed</>
                )}
                {leg.inboundLeg.inboundScheduledArrival && <> · Arr. {fmt(leg.inboundLeg.inboundScheduledArrival)}</>}
              </span>
            </div>
          </div>
        )}

        {/* Expandable: Detailed timetable */}
        <button
          onClick={() => setShowTimetable(!showTimetable)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full mb-1"
        >
          {showTimetable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Detailed timetable
        </button>

        {showTimetable && (
          <div className="border rounded-lg p-3 mb-3 space-y-0.5">
            <TimelineRow label="Gate departure" scheduled={leg.scheduledDeparture} estimated={leg.estimatedDeparture} actual={leg.actualDeparture} isKey />
            {taxiOutMinutes !== null && (
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted-foreground pl-3">Taxi out</span>
                <span className="text-xs text-muted-foreground">{formatDuration(taxiOutMinutes)}</span>
              </div>
            )}
            <TimelineRow label="Takeoff" scheduled={leg.scheduledOff} estimated={leg.estimatedOff} actual={leg.actualOff} isKey />
            {airMinutes !== null && (
              <div className="flex justify-between py-1 border-y border-dashed my-1">
                <span className="text-xs text-muted-foreground pl-3">✈ Air time</span>
                <span className="text-xs font-medium">{formatDuration(airMinutes)}</span>
              </div>
            )}
            <TimelineRow label="Landing" scheduled={leg.scheduledOn} estimated={leg.estimatedOn} actual={leg.actualOn} isKey />
            {taxiInMinutes !== null && (
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted-foreground pl-3">Taxi in</span>
                <span className="text-xs text-muted-foreground">{formatDuration(taxiInMinutes)}</span>
              </div>
            )}
            <TimelineRow label="Gate arrival" scheduled={leg.scheduledArrival} estimated={leg.estimatedArrival} actual={leg.actualArrival} isKey />
            {totalMinutes !== null && (
              <div className="flex justify-between pt-2 mt-1 border-t">
                <span className="text-xs text-muted-foreground font-medium">Total block time</span>
                <span className="text-xs font-semibold">{formatDuration(totalMinutes)}</span>
              </div>
            )}
          </div>
        )}

        {/* Expandable: Recent flight history */}
        <button
          onClick={handleLoadRotation}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
          disabled={loadingRotation}
        >
          {showRotation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {loadingRotation ? 'Loading history...' : 'Recent flight history'}
        </button>

        {rotationError && <p className="text-xs text-amber-600 mt-1">{rotationError}</p>}

        {showRotation && history && (
          <div className="border rounded-lg overflow-hidden mt-2">
            <div className="bg-muted/50 px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {history.flightNumber} — last {history.history.length} operations
              </span>
            </div>
            <div className="divide-y">
              {history.history.map((r, i) => {
                const isToday = i === history.userIndex
                const delayed = r.delayMinutes >= 15
                const effectiveDep = r.actualDeparture || r.scheduledDeparture
                const effectiveArr = r.actualArrival || r.scheduledArrival
                return (
                  <div key={i} className={`px-3 py-2 text-xs ${isToday ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium w-24 shrink-0 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{r.date}</span>
                      <span className="font-medium">{r.originIata}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{r.destinationIata}</span>
                      <span className="text-muted-foreground">{fmt(effectiveDep)} – {fmt(effectiveArr)}</span>
                      <span className={`ml-auto shrink-0 ${r.cancelled ? 'text-red-600' : rotationStatusColor(r.status)}`}>
                        {r.cancelled ? 'cancelled' : r.status.replace(/_/g, ' ')}
                      </span>
                      {delayed && !r.cancelled && (
                        <span className="text-yellow-600 font-medium shrink-0">+{r.delayMinutes}m</span>
                      )}
                      {isToday && <span className="text-primary font-semibold shrink-0">← today</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
