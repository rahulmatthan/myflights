'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { colorBg, USER_COLORS } from '@/lib/user-colors'

interface Props {
  user: { name: string | null; color: string | null }
}

export default function ProfileSettings({ user }: Props) {
  const [name, setName] = useState(user.name ?? '')
  const [color, setColor] = useState(user.color ?? 'blue')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Your name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rahul"
          />
        </div>

        <div className="space-y-2">
          <Label>Your color</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {USER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className={`w-8 h-8 rounded-full transition-all ${colorBg(c)} ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </Button>
      </CardContent>
    </Card>
  )
}
