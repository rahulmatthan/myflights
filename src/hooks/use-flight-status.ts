'use client'

import { useEffect, useState } from 'react'

interface FlightUpdate {
  type: 'initial' | 'update'
  data: Record<string, unknown>
}

export function useFlightStatus(legId: number) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource(`/api/flights/${legId}/stream`)

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const update: FlightUpdate = JSON.parse(event.data)
        setData(update.data)
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [legId])

  return { data, connected }
}
