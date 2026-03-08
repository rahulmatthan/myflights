import { db } from '@/db'
import { users, notificationLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendPushToUser } from './push'

interface NotificationContext {
  userId: string
  flightLegId: number
  previousStatus: string
  newStatus: string
  previousDelay: number
  newDelay: number
  previousGate: string | null | undefined
  newGate: string | null | undefined
  flightNumber: string
}

export async function triggerNotifications(ctx: NotificationContext) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
  })
  if (!user) return

  const alerts: Array<{ type: string; title: string; body: string }> = []

  // Cancellation
  if (ctx.newStatus === 'cancelled' && ctx.previousStatus !== 'cancelled') {
    if (user.notifyCancellations) {
      alerts.push({
        type: 'cancellation',
        title: `${ctx.flightNumber} Cancelled`,
        body: 'Your flight has been cancelled. Check airline for rebooking options.',
      })
    }
  }

  // Boarding
  if (ctx.newStatus === 'boarding' && ctx.previousStatus !== 'boarding') {
    if (user.notifyBoarding) {
      alerts.push({
        type: 'boarding',
        title: `${ctx.flightNumber} Now Boarding`,
        body: 'Your flight is now boarding. Head to the gate!',
      })
    }
  }

  // Significant delay
  if (
    ctx.newDelay >= (user.minDelayMinutes ?? 15) &&
    ctx.newDelay > ctx.previousDelay + 5
  ) {
    if (user.notifyDelays) {
      alerts.push({
        type: 'delay',
        title: `${ctx.flightNumber} Delayed ${ctx.newDelay} min`,
        body: `Your flight is now delayed by ${ctx.newDelay} minutes.`,
      })
    }
  }

  // Gate change
  if (ctx.previousGate && ctx.newGate && ctx.previousGate !== ctx.newGate) {
    if (user.notifyGateChanges) {
      alerts.push({
        type: 'gate_change',
        title: `Gate Change: ${ctx.flightNumber}`,
        body: `Gate changed from ${ctx.previousGate} to ${ctx.newGate}.`,
      })
    }
  }

  // Send all alerts
  for (const alert of alerts) {
    try {
      await sendPushToUser(ctx.userId, {
        title: alert.title,
        body: alert.body,
        tag: `${ctx.flightLegId}-${alert.type}`,
      })

      await db.insert(notificationLog).values({
        userId: ctx.userId,
        flightLegId: ctx.flightLegId,
        type: alert.type,
        channel: 'push',
        payload: { title: alert.title, body: alert.body },
      })
    } catch (err) {
      console.error('Notification send error:', err)
    }
  }
}
