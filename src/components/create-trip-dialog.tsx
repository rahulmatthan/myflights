'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export default function CreateTripDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const trip = await res.json()
      setOpen(false)
      setName('')
      router.push(`/trips/${trip.id}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Trip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name</Label>
            <Input
              id="trip-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Summer Vacation 2026"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full">
            {loading ? 'Creating...' : 'Create Trip'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
