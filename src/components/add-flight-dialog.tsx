'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface FlightInfo {
  flightNumber: string
  airlineIata: string
  originIata: string
  destinationIata: string
  scheduledDeparture: string
  scheduledArrival: string
  estimatedDeparture?: string
  estimatedArrival?: string
  status: string
  delayMinutes?: number
  aircraftType?: string
  aircraftRegistration?: string
  gateDeparture?: string
  gateArrival?: string
  terminalDeparture?: string
  terminalArrival?: string
}

export default function AddFlightDialog({ tripId }: { tripId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [flightNum, setFlightNum] = useState('')
  const [date, setDate] = useState('')
  const [searching, setSearching] = useState(false)
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null)
  const [error, setError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [adding, setAdding] = useState(false)

  // Manual entry fields
  const [manual, setManual] = useState({
    originIata: '',
    destinationIata: '',
    depTime: '',
    arrTime: '',
  })

  function reset() {
    setFlightNum('')
    setDate('')
    setFlightInfo(null)
    setError('')
    setShowManual(false)
    setManual({ originIata: '', destinationIata: '', depTime: '', arrTime: '' })
  }

  async function handleSearch() {
    if (!flightNum || !date) return
    setSearching(true)
    setError('')
    setFlightInfo(null)
    setShowManual(false)

    const res = await fetch(
      `/api/flights/search?flight=${encodeURIComponent(flightNum.replace(/\s+/g, ''))}&date=${date}`
    )
    const data = await res.json()

    if (res.ok) {
      setFlightInfo(data)
    } else if (res.status === 422 && data.code === 'TOO_FAR_FUTURE') {
      setError(data.error)
      setShowManual(true)
    } else {
      setError(data.error ?? 'Flight not found. Check the flight number and date.')
    }
    setSearching(false)
  }

  async function submitLeg(info: FlightInfo) {
    setAdding(true)
    const res = await fetch(`/api/trips/${tripId}/legs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    })
    if (res.ok) {
      setOpen(false)
      reset()
      router.refresh()
    }
    setAdding(false)
  }

  function handleManualAdd() {
    if (!manual.originIata || !manual.destinationIata || !manual.depTime || !manual.arrTime) return
    const cleaned = flightNum.replace(/\s+/g, '').toUpperCase()
    submitLeg({
      flightNumber: cleaned,
      airlineIata: cleaned.slice(0, 2),
      originIata: manual.originIata.toUpperCase(),
      destinationIata: manual.destinationIata.toUpperCase(),
      scheduledDeparture: new Date(`${date}T${manual.depTime}:00`).toISOString(),
      scheduledArrival: new Date(`${date}T${manual.arrTime}:00`).toISOString(),
      status: 'scheduled',
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Flight
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Flight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Flight Number</Label>
              <Input
                value={flightNum}
                onChange={e => setFlightNum(e.target.value.toUpperCase())}
                placeholder="AA123"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSearch} disabled={!flightNum || !date || searching} className="w-full">
            {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Search Flight
          </Button>

          {error && <p className="text-sm text-amber-600">{error}</p>}

          {/* Result from API */}
          {flightInfo && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{flightInfo.flightNumber}</span>
                <span className="text-sm text-muted-foreground">{flightInfo.aircraftType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{flightInfo.originIata}</span>
                <span>&rarr;</span>
                <span className="font-medium">{flightInfo.destinationIata}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Dep: {format(new Date(flightInfo.scheduledDeparture), 'MMM d, HH:mm')}
                {' · '}
                Arr: {format(new Date(flightInfo.scheduledArrival), 'MMM d, HH:mm')}
              </div>
              <Button onClick={() => submitLeg(flightInfo)} disabled={adding} className="w-full">
                {adding ? 'Adding...' : 'Add to Trip'}
              </Button>
            </div>
          )}

          {/* Manual entry for flights beyond the 2-day API window */}
          {showManual && (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Enter flight details manually</p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">From (IATA)</Label>
                  <Input
                    value={manual.originIata}
                    onChange={e => setManual(m => ({ ...m, originIata: e.target.value.toUpperCase() }))}
                    placeholder="JFK"
                    maxLength={3}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">To (IATA)</Label>
                  <Input
                    value={manual.destinationIata}
                    onChange={e => setManual(m => ({ ...m, destinationIata: e.target.value.toUpperCase() }))}
                    placeholder="LAX"
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Departure time (local)</Label>
                  <Input
                    type="time"
                    value={manual.depTime}
                    onChange={e => setManual(m => ({ ...m, depTime: e.target.value }))}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Arrival time (local)</Label>
                  <Input
                    type="time"
                    value={manual.arrTime}
                    onChange={e => setManual(m => ({ ...m, arrTime: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Live status will be fetched automatically once within 2 days of departure.
              </p>
              <Button
                onClick={handleManualAdd}
                disabled={adding || !manual.originIata || !manual.destinationIata || !manual.depTime || !manual.arrTime}
                className="w-full"
              >
                {adding ? 'Adding...' : 'Add to Trip'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
