'use client'

import { Copy, ExternalLink, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  buildLeadCopilotAdminWhatsAppSummary,
  buildLeadCopilotSuggestedNote,
  buildWhatsAppHref,
  type LeadCopilotResult,
} from '@/lib/leadAi'
import { readResponseJson } from '@/lib/safeJson'

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
  leadId: number
  canUseAi: boolean
  adminWhatsappNumber: string | null
  onApplySuggestedNote?: (value: string) => void
}

function badgeLabel(
  locale: 'de' | 'en' | null,
  type: 'fit' | 'urgency',
  value: 'high' | 'medium' | 'low',
) {
  const labels =
    locale === 'en'
      ? {
          fit: { high: 'High fit', medium: 'Medium fit', low: 'Low fit' },
          urgency: { high: 'High urgency', medium: 'Medium urgency', low: 'Low urgency' },
        }
      : {
          fit: { high: 'Hoher Fit', medium: 'Mittlerer Fit', low: 'Niedriger Fit' },
          urgency: { high: 'Hohe Dringlichkeit', medium: 'Mittlere Dringlichkeit', low: 'Niedrige Dringlichkeit' },
        }
  return labels[type][value]
}

export function ConsoleLeadCopilotPanel({
  leadId,
  canUseAi,
  adminWhatsappNumber,
  onApplySuggestedNote,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LeadCopilotResult | null>(null)
  const [meta, setMeta] = useState<LeadCopilotResponse['meta'] | null>(null)
  const [copiedState, setCopiedState] = useState<string | null>(null)
  const locale = meta?.locale ?? null

  async function copyValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedState(key)
      window.setTimeout(() => setCopiedState((current) => (current === key ? null : current)), 2000)
    } catch {
      setError(locale === 'en' ? 'Copy failed.' : 'Kopieren fehlgeschlagen.')
    }
  }

  async function generate() {
    if (!canUseAi) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ai/lead-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await readResponseJson<LeadCopilotResponse>(res)
      if (!res.ok) {
        setError(data?.error ?? 'AI request failed')
        return
      }
      setResult(data?.result ?? null)
      setMeta(data?.meta ?? null)
    } catch {
      setError(locale === 'en' ? 'Network error.' : 'Netzwerkfehler.')
    } finally {
      setBusy(false)
    }
  }

  const appliedNote = useMemo(
    () => (result ? buildLeadCopilotSuggestedNote(result) : ''),
    [result],
  )
  const adminWhatsAppHref = useMemo(() => {
    if (!result || !meta?.leadLabel) return null
    return buildWhatsAppHref(
      adminWhatsappNumber,
      buildLeadCopilotAdminWhatsAppSummary({
        result,
        leadLabel: meta.leadLabel,
        locale: locale ?? 'de',
      }),
    )
  }, [adminWhatsappNumber, locale, meta?.leadLabel, result])

  if (!canUseAi) {
    return (
      <section className="tma-console-note">
        <h2 className="tma-console-subheading">AI lead copilot</h2>
        <p className="tma-console-hint" style={{ marginBottom: 0 }}>
          Use an <code>ops</code> or <code>admin</code> role to access AI lead suggestions.
        </p>
      </section>
    )
  }

  return (
    <section className="tma-console-copilot">
      <div className="tma-console-copilot__head">
        <div>
          <h2 className="tma-console-subheading" style={{ marginBottom: '0.35rem' }}>
            <Sparkles size={16} aria-hidden="true" /> AI lead copilot
          </h2>
          <p className="tma-console-hint" style={{ marginBottom: 0 }}>
            Suggestions only. Review before sending or saving.
          </p>
        </div>
        <div className="tma-console-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? 'Generating…' : result ? 'Refresh summary' : 'Generate summary'}
          </button>
        </div>
      </div>

      {error ? (
        <p className={error.includes('AI API key not configured') ? 'tma-console-env-warning' : 'tma-console-error'}>
          {error.includes('AI API key not configured')
            ? 'AI is unavailable. Set TMA_AI_API_KEY (or OPENAI_API_KEY) and optional TMA_AI_BASE_URL / TMA_AI_MODEL.'
            : error}
        </p>
      ) : null}

      {result ? (
        <>
          <div className="tma-console-copilot__meta">
            <span className={`tma-console-status-pill tma-console-status-pill--${result.fit}`}>
              {badgeLabel(locale, 'fit', result.fit)}
            </span>
            <span className={`tma-console-status-pill tma-console-status-pill--${result.urgency}`}>
              {badgeLabel(locale, 'urgency', result.urgency)}
            </span>
            {meta?.generatedAt ? (
              <span className="tma-console-hint" style={{ margin: 0 }}>
                {locale === 'en' ? 'Generated' : 'Erstellt'}{' '}
                {new Date(meta.generatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          <div className="tma-console-copilot__grid">
            <div className="tma-console-note" style={{ marginTop: 0 }}>
              <h3 className="tma-console-subheading">Summary</h3>
              <p className="tma-console-lead">{result.summary}</p>
              <h3 className="tma-console-subheading">Recommended next step</h3>
              <p className="tma-console-lead">{result.recommendedNextStep}</p>
              <h3 className="tma-console-subheading">Checklist</h3>
              <ul className="tma-console-copilot__list">
                {result.followUpChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {result.warnings?.length ? (
                <>
                  <h3 className="tma-console-subheading">Warnings</h3>
                  <ul className="tma-console-copilot__list">
                    {result.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {result.missingInfo?.length ? (
                <>
                  <h3 className="tma-console-subheading">Missing info</h3>
                  <ul className="tma-console-copilot__list">
                    {result.missingInfo.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div className="tma-console-note" style={{ marginTop: 0 }}>
              <h3 className="tma-console-subheading">WhatsApp draft</h3>
              <p className="tma-console-lead">{result.whatsAppDraft}</p>
              <div className="tma-console-actions">
                <button
                  type="button"
                  className="tma-console-btn-secondary"
                  onClick={() => void copyValue(result.whatsAppDraft, 'wa')}
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  {copiedState === 'wa' ? 'Copied' : 'Copy WhatsApp draft'}
                </button>
                <a
                  className={`tma-console-btn-secondary${meta?.whatsAppHref ? '' : ' is-disabled'}`}
                  href={meta?.whatsAppHref ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!meta?.whatsAppHref}
                  onClick={(event) => {
                    if (!meta?.whatsAppHref) event.preventDefault()
                  }}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Open WhatsApp
                </a>
                <a
                  className={`tma-console-btn-secondary${adminWhatsAppHref ? '' : ' is-disabled'}`}
                  href={adminWhatsAppHref ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!adminWhatsAppHref}
                  onClick={(event) => {
                    if (!adminWhatsAppHref) event.preventDefault()
                  }}
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  Send to my WhatsApp
                </a>
              </div>
              {!adminWhatsappNumber ? (
                <p className="tma-console-hint">
                  Add your own WhatsApp number in Settings to send AI lead summaries to yourself.
                </p>
              ) : null}
              {result.emailDraft ? (
                <>
                  <h3 className="tma-console-subheading">Email draft</h3>
                  <p className="tma-console-lead">{result.emailDraft}</p>
                  <div className="tma-console-actions">
                    <button
                      type="button"
                      className="tma-console-btn-secondary"
                      onClick={() => void copyValue(result.emailDraft!, 'email')}
                    >
                      <Mail size={14} aria-hidden="true" />
                      {copiedState === 'email' ? 'Copied' : 'Copy email draft'}
                    </button>
                  </div>
                </>
              ) : null}
              <h3 className="tma-console-subheading">Reasoning</h3>
              <p className="tma-console-hint">{result.reasoning}</p>
              {result.replyGoal ? (
                <p className="tma-console-hint">
                  <strong>Reply goal:</strong> {result.replyGoal}
                </p>
              ) : null}
              {result.bestContactChannel ? (
                <p className="tma-console-hint">
                  <strong>Best channel:</strong> {result.bestContactChannel}
                </p>
              ) : null}
              {onApplySuggestedNote ? (
                <div className="tma-console-actions">
                  <button
                    type="button"
                    className="tma-console-btn-secondary"
                    onClick={() => onApplySuggestedNote(appliedNote)}
                  >
                    <Copy size={14} aria-hidden="true" />
                    Apply suggested note
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <p className="tma-console-hint" style={{ marginBottom: 0 }}>
          Generate a concise lead summary, next-step recommendation, and share-ready follow-up draft.
        </p>
      )}
    </section>
  )
}
