import { NextResponse } from 'next/server'
import { runMonitor } from '@/lib/monitor/status-updater'

// This endpoint is called by Vercel Cron every 5 minutes
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runMonitor()
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Monitor route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
