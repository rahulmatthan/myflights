import { db } from '@/db'
import { delegations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

/** Returns true if userId can manage flights for travelerId (is them, or is their delegate) */
export async function canManageFlightsFor(userId: string, travelerId: string): Promise<boolean> {
  if (userId === travelerId) return true
  const delegation = await db.query.delegations.findFirst({
    where: and(eq(delegations.delegatorId, travelerId), eq(delegations.delegateId, userId)),
  })
  return !!delegation
}

/** Returns the IDs of all users who have delegated to userId */
export async function getDelegatorIds(userId: string): Promise<string[]> {
  const rows = await db.query.delegations.findMany({
    where: eq(delegations.delegateId, userId),
    columns: { delegatorId: true },
  })
  return rows.map(r => r.delegatorId)
}
