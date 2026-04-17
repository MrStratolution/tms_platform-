'use client'

import Link from 'next/link'
import { Copy, ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  buildLeadCopilotAdminWhatsAppSummary,
  buildWhatsAppHref,
  type LeadCopilotResult,
} from '@/lib/leadAi'
import { readResponseJson } from '@/lib/safeJson'

type LeadCopilotDashboardRow = {
  id: number
  leadLabel: string
  company: string | null
  phone: string | null
  leadStatus: string
  bookingStatus: string
  scheduledFor: string | null
  sourcePageSlug: string | null
}

type LeadCopilotResponse = {
  ok?: boolean
  result?: LeadCopilotResult
  meta?: {
    leadLabel: string
    email: string
    phone: string | null
    whatsappPhone: string | null
    locale: 'de' | 'en'
    whatsAppHref: string | null
    generatedAt: string
  }
  error?: string
}

type Props = {
  adminWhatsappNumber: string | null
  groups: {
    title: string
    rows: LeadCopilotDashboardRow[]
  }[]
}

type ResultState = {
  busy: boolean
  error: string | null
  result: LeadCopilotResult | null
  meta: LeadCopilotResponse['meta'] | null
}

function urgencyBadgeClass(urgency: LeadCopilotResult['urgency'] | null) {
  if (!urgency) return 'tma-console-status-pill'
  return `tma-console-status-pill tma-console-status-pill--${urgency}`
}

export function ConsoleLeadCopilotDashboardPanel({ adminWhatsappNumber, groups }: Props) {
  const [states, setStates] = useState<Record<number, ResultState>>({})
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const prefetchIds = useMemo(
    () => groups.map((group) => group.rows[0]?.id).filter((value): value is number => Boolean(value)),
    [groups],
  )

  useEffect(() => {
    for (const id of prefetchIds) {
      void ensureResult(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchIds.join(',')])

  async function ensureResult(leadId: number) {
    if (states[leadId]?.busy) return states[leadId]
    if (states[leadId]?.result) return states[leadId]
    return fetchResult(leadId)
  }

  async function fetchResult(leadId: number) {
    setStates((current) => ({
      ...current,
      [leadId]: {
        busy: true,
        error: null,
        result: current[leadId]?.result ?? null,
        meta: current[leadId]?.meta ?? null,
      },
    }))
    try {
      const res = await fetch('/api/admin/ai/lead-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await readResponseJson<LeadCopilotResponse>(res)
      if (!res.ok) {
        const next = {
          busy: false,
          error: data?.error ?? 'AI request failed',
          result: null,
          meta: null,
        }
        setStates((current) => ({ ...current, [leadId]: next }))
        return next
      }
      const next = {
        busy: false,
        error: null,
        result: data?.result ?? null,
        meta: data?.meta ?? null,
      }
      setStates((current) => ({ ...current, [leadId]: next }))
      return next
    } catch {
      const next = {
        busy: false,
        error: 'Network error',
        result: null,
        meta: null,
      }
      setStates((current) => ({ ...current, [leadId]: next }))
      return next
    }
  }

  async function copyDraft(leadId: number) {
    const state = await ensureResult(leadId)
    if (!state?.result?.whatsAppDraft) return
    await navigator.clipboard.writeText(state.result.whatsAppDraft)
    setCopiedId(leadId)
    window.setTimeout(() => setCopiedId((current) => (current === leadId ? null : current)), 2000)
  }

  async function openWhatsApp(leadId: number) {
    const state = await ensureResult(leadId)
    if (!state?.meta?.whatsAppHref) return
    window.open(state.meta.whatsAppHref, '_blank', 'noopener,noreferrer')
  }

  async function openMyWhatsApp(leadId: number) {
    const state = await ensureResult(leadId)
    if (!state?.result || !state.meta?.leadLabel) return
    const href = buildWhatsAppHref(
      adminWhatsappNumber,
      buildLeadCopilotAdminWhatsAppSummary({
        result: state.result,
        leadLabel: state.meta.leadLabel,
        locale: state.meta.locale,
      }),
    )
    if (!href) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (!groups.some((group) => group.rows.length)) {
    return null
  }

  return (
    <section className="tma-console-note">
      <div className="tma-console-copilot__head">
        <div>
          <h2 className="tma-console-subheading" style={{ marginBottom: '0.35rem' }}>
            <Sparkles size={16} aria-hidden="true" /> Lead copilot
          </h2>
          <p className="tma-console-hint" style={{ marginBottom: 0 }}>
            AI summaries are generated on demand. Review before sending or saving anything.
          </p>
          {!adminWhatsappNumber ? (
            <p className="tma-console-hint" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
              Add your own WhatsApp number in Settings to use <strong>Send to my WhatsApp</strong>.
            </p>
          ) : null}
        </div>
      </div>

      <div className="tma-console-copilot-groups">
        {groups.map((group) =>
          group.rows.length ? (
            <section key={group.title} className="tma-console-copilot-group">
              <h3 className="tma-console-subheading">{group.title}</h3>
              <div className="tma-console-copilot-list">
                {group.rows.map((row) => {
                  const state = states[row.id]
                  return (
                    <article key={row.id} className="tma-console-copilot-row">
                      <div className="tma-console-copilot-row__main">
                        <div className="tma-console-copilot-row__topline">
                          <strong>{row.leadLabel}</strong>
                          {row.company ? <span>{row.company}</span> : null}
                          <span>{row.leadStatus}</span>
                          <span>{row.bookingStatus}</span>
                          {state?.result ? (
                            <span className={urgencyBadgeClass(state.result.urgency)}>
                              {state.result.urgency}
                            </span>
                          ) : null}
                        </div>
                        <p className="tma-console-hint" style={{ marginBottom: '0.35rem' }}>
                          {row.sourcePageSlug ? `/${row.sourcePageSlug}` : 'No source page'}
                          {row.scheduledFor
                            ? ` · ${new Date(row.scheduledFor).toLocaleString()}`
                            : ''}
                        </p>
                        <p className="tma-console-lead" style={{ marginBottom: 0 }}>
                          {state?.busy
                            ? 'Generating AI summary…'
                            : state?.result?.summary ??
                              state?.error ??
                              'Generate a short summary and follow-up draft.'}
                        </p>
                      </div>
                      <div className="tma-console-actions" style={{ marginTop: 0 }}>
                        <Link href={`/console/leads/${row.id}`} className="tma-console-btn-secondary">
                          Open lead
                        </Link>
                        <button
                          type="button"
                          className="tma-console-btn-secondary"
                          onClick={() => void openWhatsApp(row.id)}
                          disabled={state?.busy || !row.phone}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          Lead WhatsApp
                        </button>
                        <button
                          type="button"
                          className="tma-console-btn-secondary"
                          onClick={() => void openMyWhatsApp(row.id)}
                          disabled={state?.busy || !adminWhatsappNumber}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          Send to my WhatsApp
                        </button>
                        <button
                          type="button"
                          className="tma-console-btn-secondary"
                          onClick={() => void copyDraft(row.id)}
                          disabled={state?.busy}
                        >
                          <Copy size={14} aria-hidden="true" />
                          {copiedId === row.id ? 'Copied' : 'Copy follow-up'}
                        </button>
                        <button
                          type="button"
                          className="tma-console-btn-secondary"
                          onClick={() => void fetchResult(row.id)}
                          disabled={state?.busy}
                          aria-label={`Refresh AI summary for lead ${row.id}`}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </section>
  )
}
