'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { colorBg } from '@/lib/user-colors'
import { X } from 'lucide-react'

interface DelegateUser {
  delegationId: number
  id: string
  name: string | null
  email: string
  color: string | null
}

export default function DelegationSettings() {
  const [delegates, setDelegates] = useState<DelegateUser[]>([])
  const [delegators, setDelegators] = useState<DelegateUser[]>([])
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/delegations')
    if (res.ok) {
      const data = await res.json()
      setDelegates(data.delegates ?? [])
      setDelegators(data.delegators ?? [])
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch('/api/delegations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setEmail('')
      setDelegates(prev => [...prev, data])
    } else {
      setError(data.error ?? 'Failed to add delegate')
    }
    setAdding(false)
  }

  async function handleRemove(delegationId: number) {
    await fetch('/api/delegations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegationId }),
    })
    setDelegates(prev => prev.filter(d => d.delegationId !== delegationId))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flight Access</CardTitle>
        <CardDescription>
          Allow someone (e.g. a secretary) to add and manage flights on your behalf.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* People I manage flights for */}
        {delegators.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">You manage flights for</Label>
            <div className="space-y-1.5">
              {delegators.map(d => (
                <div key={d.delegationId} className="flex items-center gap-2 text-sm py-1">
                  <div className={`w-3 h-3 rounded-full ${colorBg(d.color ?? 'blue')}`} />
                  <span className="font-medium">{d.name ?? d.email}</span>
                  {d.name && <span className="text-muted-foreground text-xs">{d.email}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* People who can manage my flights */}
        <div className="space-y-2">
          <Label className="text-sm">People who can manage your flights</Label>
          {delegates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has access yet.</p>
          ) : (
            <div className="space-y-1.5">
              {delegates.map(d => (
                <div key={d.delegationId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${colorBg(d.color ?? 'blue')}`} />
                    <span className="font-medium">{d.name ?? d.email}</span>
                    {d.name && <span className="text-muted-foreground text-xs">{d.email}</span>}
                  </div>
                  <button
                    onClick={() => handleRemove(d.delegationId)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Add by email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="secretary@example.com"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding || !email.trim()}>
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            They must already have an account. They&apos;ll be able to add and edit your flights.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
