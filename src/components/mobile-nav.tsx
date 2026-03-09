'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plane, Map, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/flights', label: 'Flights', icon: Plane },
  { href: '/airports', label: 'Delays', icon: Map },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around h-16 px-2">
      {navItems.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 flex-1 py-2 rounded-lg transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
