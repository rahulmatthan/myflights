import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allUsers = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, color: true, image: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  })

  return NextResponse.json(allUsers)
}
