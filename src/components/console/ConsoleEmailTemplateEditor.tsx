'use client'

import { useMemo, useState } from 'react'

import {
  EMAIL_TEMPLATE_TOKENS,
  decodeStructuredEmailBody,
  defaultStructuredEmailDocument,
  encodeStructuredEmailBody,
  renderStructuredEmailHtml,
  sampleEmailTemplateVars,
  type EmailTemplateUseCase,
  type StructuredEmailBlock,
  type StructuredEmailDocument,
} from '@/lib/emailTemplateContent'
import { interpolateTemplate } from '@/lib/emailSend'
import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  slug: string
  initialName: string
  initialSubject: string
  initialBody: string
  canEdit: boolean
  canAdvanced?: boolean
}

function nextBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultBlock(type: StructuredEmailBlock['type'] = 'text'): StructuredEmailBlock {
  return {
    id: nextBlockId(),
    type,
    title: '',
    body: '',
    items: type === 'bullets' ? [''] : [],
  }
}

export function ConsoleEmailTemplateEditor({
  id,
  slug,
  initialName,
  initialSubject,
  initialBody,
  canEdit,
  canAdvanced = false,
}: Props) {
  const decoded = useMemo(() => decodeStructuredEmailBody(initialBody), [initialBody])
  const [name, setName] = useState(initialName)
  const [subject, setSubject] = useState(initialSubject)
  const [document, setDocument] = useState<StructuredEmailDocument>(decoded.document)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'builder' | 'advanced'>('builder')
  const [advancedBody, setAdvancedBody] = useState<string>(
    decoded.document.htmlOverride || decoded.renderedHtml || renderStructuredEmailHtml(decoded.document),
  )
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const previewVars = sampleEmailTemplateVars(document.useCase)
  const renderedPreviewBody = interpolateTemplate(
    document.htmlOverride.trim() || renderStructuredEmailHtml(document),
    previewVars,
  )
  const renderedPreviewSubject = interpolateTemplate(subject, previewVars)

  function updateBlock(index: number, patch: Partial<StructuredEmailBlock>) {
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block,
      ),
    }))
  }

  function removeBlock(index: number) {
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index),
    }))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setDocument((current) => {
      const target = index + direction
      if (target < 0 || target >= current.blocks.length) return current
      const next = [...current.blocks]
      const [block] = next.splice(index, 1)
      next.splice(target, 0, block)
      return { ...current, blocks: next }
    })
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(token)
      window.setTimeout(() => setCopiedToken(null), 1200)
    } catch {
      setCopiedToken(null)
    }
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const trimmedName = name.trim()
    const trimmedSubject = subject.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (!trimmedSubject) {
      setError('Subject is required.')
      return
    }

    const nextDocument =
      tab === 'advanced' && canAdvanced
        ? { ...document, htmlOverride: advancedBody.trim() }
        : document

    setSaving(true)
    try {
      const res = await fetch(`/api/console/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          subject: trimmedSubject,
          body: encodeStructuredEmailBody(nextDocument),
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        emailTemplate?: {
          name: string
          subject: string
          body: string
          updatedAt: string
        }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      if (data?.emailTemplate) {
        const reparsed = decodeStructuredEmailBody(data.emailTemplate.body)
        setName(data.emailTemplate.name)
        setSubject(data.emailTemplate.subject)
        setDocument(reparsed.document)
        setAdvancedBody(
          reparsed.document.htmlOverride ||
            reparsed.renderedHtml ||
            renderStructuredEmailHtml(reparsed.document),
        )
      }
      setSuccess(
        `Saved at ${new Date(data?.emailTemplate?.updatedAt ?? Date.now()).toLocaleString()}`,
      )
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}

      <p className="tma-console-lead">
        Slug <code>{slug}</code> — the guided builder generates the final HTML for sending; advanced mode can override that output for admins.
      </p>

      <div className="tma-console-actions" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={tab === 'builder' ? 'tma-console-submit' : 'tma-console-btn-secondary'}
          onClick={() => setTab('builder')}
        >
          Builder
        </button>
        {canAdvanced ? (
          <button
            type="button"
            className={tab === 'advanced' ? 'tma-console-submit' : 'tma-console-btn-secondary'}
            onClick={() => setTab('advanced')}
          >
            Advanced HTML
          </button>
        ) : null}
      </div>

      <div className="tma-console-field-row">
        <label className="tma-console-label">
          Display name
          <input
            type="text"
            className="tma-console-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving || readOnly}
          />
        </label>
        <label className="tma-console-label">
          Use case
          <select
            className="tma-console-input"
            value={document.useCase}
            onChange={(e) =>
              setDocument((current) => ({
                ...defaultStructuredEmailDocument(e.target.value as EmailTemplateUseCase),
                ctaLabel: current.ctaLabel,
                ctaUrl: current.ctaUrl,
              }))
            }
            disabled={saving || readOnly}
          >
            <option value="generic">Generic</option>
            <option value="lead_thank_you">Lead thank-you</option>
            <option value="booking_confirmation">Booking confirmation</option>
            <option value="booking_reminder">Booking reminder</option>
            <option value="internal_lead_notification">Internal lead notification</option>
            <option value="internal_sync_alert">Internal sync alert</option>
          </select>
        </label>
      </div>

      <label className="tma-console-label">
        Subject
        <input
          type="text"
          className="tma-console-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={saving || readOnly}
          autoComplete="off"
        />
      </label>

      {tab === 'advanced' && canAdvanced ? (
        <>
          <p className="tma-console-note" style={{ marginTop: 0 }}>
            Editing raw HTML here overrides the structured builder output until you clear or replace the override in builder mode.
          </p>
          <label className="tma-console-label">
            Raw HTML override
            <textarea
              className="tma-console-textarea-json"
              value={advancedBody}
              onChange={(e) => setAdvancedBody(e.target.value)}
              disabled={saving || readOnly}
              spellCheck={false}
              rows={20}
            />
          </label>
        </>
      ) : (
        <>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Preheader
              <input
                type="text"
                className="tma-console-input"
                value={document.preheader}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, preheader: e.target.value }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Footer / sign-off
              <input
                type="text"
                className="tma-console-input"
                value={document.footer}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, footer: e.target.value }))
                }
                disabled={saving || readOnly}
              />
            </label>
          </div>

          <label className="tma-console-label">
            Intro
            <textarea
              className="tma-console-textarea-prose"
              value={document.intro}
              onChange={(e) =>
                setDocument((current) => ({ ...current, intro: e.target.value }))
              }
              disabled={saving || readOnly}
              rows={4}
            />
          </label>

          <fieldset className="tma-console-fieldset" disabled={saving || readOnly}>
            <legend className="tma-console-subheading">Body blocks</legend>
            {document.blocks.map((block, index) => (
              <div key={block.id} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">
                    {block.type} block {index + 1}
                  </span>
                  <div className="tma-console-actions">
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveBlock(index, 1)} disabled={index === document.blocks.length - 1}>
                      Down
                    </button>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removeBlock(index)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Block type
                    <select
                      className="tma-console-input"
                      value={block.type}
                      onChange={(e) =>
                        updateBlock(index, {
                          type: e.target.value as StructuredEmailBlock['type'],
                          items:
                            e.target.value === 'bullets'
                              ? block.items.length > 0
                                ? block.items
                                : ['']
                              : [],
                        })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="bullets">Bullets</option>
                      <option value="notice">Notice</option>
                    </select>
                  </label>
                  <label className="tma-console-label">
                    Title
                    <input
                      className="tma-console-input"
                      value={block.title}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                    />
                  </label>
                </div>
                <label className="tma-console-label">
                  Body
                  <textarea
                    className="tma-console-textarea-prose"
                    value={block.body}
                    onChange={(e) => updateBlock(index, { body: e.target.value })}
                    rows={4}
                  />
                </label>
                {block.type === 'bullets' ? (
                  <label className="tma-console-label">
                    Bullet items
                    <textarea
                      className="tma-console-textarea-prose"
                      value={block.items.join('\n')}
                      onChange={(e) =>
                        updateBlock(index, {
                          items: e.target.value.split('\n'),
                        })
                      }
                      rows={4}
                    />
                  </label>
                ) : null}
              </div>
            ))}
            <div className="tma-console-actions">
              <button type="button" className="tma-console-btn-secondary" onClick={() => setDocument((current) => ({ ...current, blocks: [...current.blocks, defaultBlock('text')] }))}>
                Add text block
              </button>
              <button type="button" className="tma-console-btn-secondary" onClick={() => setDocument((current) => ({ ...current, blocks: [...current.blocks, defaultBlock('bullets')] }))}>
                Add bullets block
              </button>
              <button type="button" className="tma-console-btn-secondary" onClick={() => setDocument((current) => ({ ...current, blocks: [...current.blocks, defaultBlock('notice')] }))}>
                Add notice block
              </button>
            </div>
          </fieldset>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              CTA label
              <input
                className="tma-console-input"
                value={document.ctaLabel}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, ctaLabel: e.target.value }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              CTA URL
              <input
                className="tma-console-input"
                value={document.ctaUrl}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, ctaUrl: e.target.value }))
                }
                disabled={saving || readOnly}
                placeholder="https://..."
              />
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h2 className="tma-console-subheading">Token picker</h2>
            <div className="tma-console-actions">
              {EMAIL_TEMPLATE_TOKENS[document.useCase].map((token) => (
                <button
                  key={token}
                  type="button"
                  className="tma-console-btn-secondary"
                  onClick={() => void copyToken(token)}
                >
                  {copiedToken === token ? 'Copied' : token}
                </button>
              ))}
            </div>
          </div>

          {document.htmlOverride.trim() ? (
            <p className="tma-console-env-warning" role="status">
              <strong>Advanced override active.</strong> The preview below is showing your raw HTML override instead of the structured builder output.
            </p>
          ) : null}
        </>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h2 className="tma-console-subheading">Live preview</h2>
        <div
          style={{
            border: '1px solid rgba(231,248,200,0.14)',
            borderRadius: '18px',
            overflow: 'hidden',
            background: '#111',
          }}
        >
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(231,248,200,0.12)', color: 'var(--tma-white-subtle)' }}>
            Subject preview: <strong style={{ color: 'var(--tma-white)' }}>{renderedPreviewSubject}</strong>
          </div>
          <div
            style={{ background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: renderedPreviewBody }}
          />
        </div>
      </div>

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      {canEdit ? (
        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
