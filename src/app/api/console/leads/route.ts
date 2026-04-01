import { NextResponse } from 'next/server'
import { and, count, desc, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsLeads } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * GET /api/console/leads?page=1&limit=50&crmSyncStatus=pending&leadStatus=new
 */
export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'leads:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  )
  const offset = (page - 1) * limit
  const crmSyncStatus = searchParams.get('crmSyncStatus')?.trim() || undefined
  const leadStatus = searchParams.get('leadStatus')?.trim() || undefined

  const filters = []
  if (crmSyncStatus) filters.push(eq(cmsLeads.crmSyncStatus, crmSyncStatus))
  if (leadStatus) filters.push(eq(cmsLeads.leadStatus, leadStatus))
  const whereClause =
    filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters)

  try {
    const [totalRow] = await db
      .select({ n: count() })
      .from(cmsLeads)
      .where(whereClause)

    const rows = await db
      .select({
        id: cmsLeads.id,
        email: cmsLeads.email,
        firstName: cmsLeads.firstName,
        lastName: cmsLeads.lastName,
        company: cmsLeads.company,
        formType: cmsLeads.formType,
        leadStatus: cmsLeads.leadStatus,
        crmSyncStatus: cmsLeads.crmSyncStatus,
        bookingStatus: cmsLeads.bookingStatus,
        sourcePageSlug: cmsLeads.sourcePageSlug,
        createdAt: cmsLeads.createdAt,
      })
      .from(cmsLeads)
      .where(whereClause)
      .orderBy(desc(cmsLeads.createdAt))
      .limit(limit)
      .offset(offset)

    const total = Number(totalRow?.n ?? 0)

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      leads: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
