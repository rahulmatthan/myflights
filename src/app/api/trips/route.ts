import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { trips } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createTripSchema = z.object({
  name: z.string().min(1).max(200),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userTrips = await db.query.trips.findMany({
    where: eq(trips.userId, session.user.id),
    with: { flightLegs: { orderBy: (l, { asc }) => [asc(l.sequenceNumber)] } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  return NextResponse.json(userTrips)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createTripSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const [trip] = await db.insert(trips).values({
    userId: session.user.id,
    name: parsed.data.name,
  }).returning()

  return NextResponse.json(trip, { status: 201 })
}
