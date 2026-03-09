import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import Sidebar from '@/components/sidebar'
import MobileNav from '@/components/mobile-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-background">
        {/* Sidebar: hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        {/* Main content: add bottom padding on mobile for nav bar */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      {/* Bottom nav: only on mobile */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </SessionProvider>
  )
}
