'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface User {
  notifyDelays?: boolean | null
  notifyGateChanges?: boolean | null
  notifyBoarding?: boolean | null
  notifyCancellations?: boolean | null
  notifyInboundDelays?: boolean | null
  notifyConnectionRisk?: boolean | null
  minDelayMinutes?: number | null
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label>{label}</Label>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export default function NotificationSettings({ user }: { user: User }) {
  const [settings, setSettings] = useState({
    notifyDelays: user.notifyDelays ?? true,
    notifyGateChanges: user.notifyGateChanges ?? true,
    notifyBoarding: user.notifyBoarding ?? true,
    notifyCancellations: user.notifyCancellations ?? true,
    notifyInboundDelays: user.notifyInboundDelays ?? true,
    notifyConnectionRisk: user.notifyConnectionRisk ?? true,
    minDelayMinutes: user.minDelayMinutes ?? 15,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure which alerts you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Toggle label="Flight delays" checked={settings.notifyDelays} onChange={v => update('notifyDelays', v)} />
        <Toggle label="Gate changes" checked={settings.notifyGateChanges} onChange={v => update('notifyGateChanges', v)} />
        <Toggle label="Boarding alerts" checked={settings.notifyBoarding} onChange={v => update('notifyBoarding', v)} />
        <Toggle label="Cancellations" checked={settings.notifyCancellations} onChange={v => update('notifyCancellations', v)} />
        <Toggle label="Inbound aircraft delays" checked={settings.notifyInboundDelays} onChange={v => update('notifyInboundDelays', v)} />
        <Toggle label="Connection at risk" checked={settings.notifyConnectionRisk} onChange={v => update('notifyConnectionRisk', v)} />

        <div className="flex items-center justify-between py-2">
          <Label>Minimum delay to alert (minutes)</Label>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.minDelayMinutes}
            onChange={e => update('minDelayMinutes', parseInt(e.target.value, 10))}
            className="w-20 text-right border rounded px-2 py-1 text-sm"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
