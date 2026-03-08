import { describe, it, expect } from 'vitest'
import { getPollInterval } from '@/lib/monitor/scheduler'

describe('getPollInterval', () => {
  const base = new Date('2026-03-08T12:00:00Z')

  it('returns stop for arrived flights', () => {
    expect(getPollInterval(base, 'arrived', base)).toBe('stop')
  })

  it('returns 3m for in_air flights', () => {
    expect(getPollInterval(base, 'in_air', base)).toBe('3m')
  })

  it('returns 6h for flights >7 days away', () => {
    const dep = new Date(base.getTime() + 8 * 24 * 60 * 60 * 1000)
    expect(getPollInterval(dep, 'scheduled', base)).toBe('6h')
  })

  it('returns 5m for flights 1-4h away', () => {
    const dep = new Date(base.getTime() + 2 * 60 * 60 * 1000)
    expect(getPollInterval(dep, 'scheduled', base)).toBe('5m')
  })

  it('returns 2m for flights <1h away', () => {
    const dep = new Date(base.getTime() + 30 * 60 * 1000)
    expect(getPollInterval(dep, 'scheduled', base)).toBe('2m')
  })
})
