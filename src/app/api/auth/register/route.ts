import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json()

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({
    id: randomUUID(),
    name,
    email,
    passwordHash,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
