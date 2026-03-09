import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { delegations, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // People I've given access to (my delegates)
  const myDelegates = await db.query.delegations.findMany({
    where: eq(delegations.delegatorId, session.user.id),
    with: { delegate: { columns: { id: true, name: true, email: true, color: true } } },
  })

  // People who have given me access (I manage their flights)
  const myDelegators = await db.query.delegations.findMany({
    where: eq(delegations.delegateId, session.user.id),
    with: { delegator: { columns: { id: true, name: true, email: true, color: true } } },
  })

  return NextResponse.json({
    delegates: myDelegates.map(d => ({ delegationId: d.id, ...d.delegate })),
    delegators: myDelegators.map(d => ({ delegationId: d.id, ...d.delegator })),
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Find the delegate user by email
  const delegate = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
    columns: { id: true, name: true, email: true },
  })
  if (!delegate) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  if (delegate.id === session.user.id) return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 })

  // Check if delegation already exists
  const existing = await db.query.delegations.findFirst({
    where: and(
      eq(delegations.delegatorId, session.user.id),
      eq(delegations.delegateId, delegate.id)
    ),
  })
  if (existing) return NextResponse.json({ error: 'Already delegated to this person' }, { status: 409 })

  const [row] = await db.insert(delegations).values({
    delegatorId: session.user.id,
    delegateId: delegate.id,
  }).returning()

  return NextResponse.json({ delegationId: row.id, ...delegate }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { delegationId } = await request.json()

  const delegation = await db.query.delegations.findFirst({
    where: eq(delegations.id, delegationId),
  })

  // Only the delegator can remove their own delegation
  if (!delegation || delegation.delegatorId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(delegations).where(eq(delegations.id, delegationId))
  return NextResponse.json({ success: true })
}
