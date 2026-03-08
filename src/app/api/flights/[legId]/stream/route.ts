import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flightLegs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ legId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { legId } = await params
  const legIdNum = parseInt(legId, 10)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial state
      const leg = await db.query.flightLegs.findFirst({
        where: eq(flightLegs.id, legIdNum),
        with: { inboundLeg: true, statusHistory: { limit: 20, orderBy: (h, { desc }) => [desc(h.recordedAt)] } },
      })

      if (leg) send({ type: 'initial', data: leg })

      // Poll for updates every 30 seconds
      const interval = setInterval(async () => {
        try {
          const updated = await db.query.flightLegs.findFirst({
            where: eq(flightLegs.id, legIdNum),
          })
          if (updated) send({ type: 'update', data: updated })
        } catch {
          clearInterval(interval)
          controller.close()
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
