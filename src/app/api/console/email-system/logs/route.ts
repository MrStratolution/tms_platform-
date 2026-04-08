import { NextResponse } from 'next/server'

import { getCustomDb } from '@/db/client'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { listEmailLogs } from '@/lib/email/systemStore'

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'integrations:manage')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const logs = await listEmailLogs(db, 200)
  return NextResponse.json({ ok: true, emailLogs: logs })
}
