import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import NotificationSettings from '@/components/notification-settings'
import ProfileSettings from '@/components/profile-settings'
import DelegationSettings from '@/components/delegation-settings'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) return null

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ProfileSettings user={{ name: user.name, color: user.color }} />
      <DelegationSettings />
      <NotificationSettings user={user} />
    </div>
  )
}
