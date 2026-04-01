'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  formBuilderDocumentToRecord,
  normalizeFormBuilderDocument,
  type FormBuilderDocument,
} from '@/lib/formConfigDocument'
import type { FormFieldDef } from '@/lib/formFields'
import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  formType: string
  initialActive: boolean
  initialDocument: Record<string, unknown>
  canEdit: boolean
  canAdvanced?: boolean
}

type EmailTemplateOption = {
  id: number
  name: string
  slug: string
}

const FIELD_TYPES: Array<FormFieldDef['type']> = [
  'text',
  'email',
  'tel',
  'textarea',
  'url',
  'checkbox',
  'section',
]

function labelToFieldName(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'newField'
  const compact = trimmed
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (compact.length === 0) return 'newField'
  return compact
    .map((part, index) =>
      index === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('')
    .replace(/[^a-zA-Z0-9_]/g, '')
}

function newField(type: FormFieldDef['type'] = 'text'): FormFieldDef {
  if (type === 'section') {
    return {
      name: `section${Date.now()}`,
      type,
      label: 'Section heading',
      helperText: '',
      width: 'full',
    }
  }
  return {
    name: `field${Date.now()}`,
    type,
    label: 'New field',
    required: false,
    placeholder: '',
    helperText: '',
    width: type === 'checkbox' ? 'full' : 'half',
  }
}

function FormPreview(props: { document: FormBuilderDocument }) {
  const { document } = props
  const columns = document.layout.columns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))'
  const widthMap: Record<FormBuilderDocument['layout']['width'], string> = {
    narrow: '24rem',
    default: '28rem',
    wide: '42rem',
    full: '100%',
  }

  return (
    <div
      className="block-form"
      style={{ maxWidth: widthMap[document.layout.width], marginTop: '1rem' }}
    >
      <h2 className="block-form__title">{document.name}</h2>
      {document.intro ? <p className="tma-muted">{document.intro}</p> : null}
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: columns }}>
        {document.fields.map((field) => {
          if (field.type === 'section') {
            return (
              <div key={field.name} style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: 0, color: 'var(--tma-lime)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' }}>
                  {field.label}
                </p>
                {field.helperText ? <p className="tma-muted" style={{ margin: '0.25rem 0 0' }}>{field.helperText}</p> : null}
              </div>
            )
          }
          const full = document.layout.columns === 1 || field.width !== 'half' || field.type === 'checkbox'
          if (field.type === 'checkbox') {
            return (
              <label key={field.name} className="block-form__check" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" disabled />
                <span>{field.label}</span>
              </label>
            )
          }
          return (
            <label key={field.name} className="book-flow__field" style={{ gridColumn: full ? '1 / -1' : 'span 1' }}>
              <span>
                {field.label}
                {field.required ? ' *' : ''}
              </span>
              {field.type === 'textarea' ? <textarea rows={4} disabled placeholder={field.placeholder} /> : <input disabled placeholder={field.placeholder} type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'} />}
              {field.helperText ? <small className="tma-muted">{field.helperText}</small> : null}
            </label>
          )
        })}
      </div>
      {document.consent.enabled ? (
        <label className="block-form__check">
          <input type="checkbox" disabled />
          <span>{document.consent.label}</span>
        </label>
      ) : null}
      <button type="button" className="tma-btn tma-btn--primary book-flow__submit" disabled>
        {document.submitLabel}
      </button>
    </div>
  )
}

export function ConsoleFormConfigEditor({
  id,
  formType,
  initialActive,
  initialDocument,
  canEdit,
  canAdvanced = false,
}: Props) {
  const [active, setActive] = useState(initialActive)
  const [document, setDocument] = useState<FormBuilderDocument>(() =>
    normalizeFormBuilderDocument(initialDocument),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'builder' | 'advanced'>('builder')
  const [advancedText, setAdvancedText] = useState(() =>
    JSON.stringify(formBuilderDocumentToRecord(normalizeFormBuilderDocument(initialDocument)), null, 2),
  )
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateOption[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/email-templates', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          emailTemplates?: { id: number; name: string; slug: string }[]
        }>(res)
        if (!cancelled && res.ok) {
          setEmailTemplates(
            (data?.emailTemplates ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              slug: row.slug,
            })),
          )
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (tab === 'builder') {
      setAdvancedText(JSON.stringify(formBuilderDocumentToRecord(document), null, 2))
    }
  }, [document, tab])

  const notifyEmailsText = useMemo(
    () => document.destination.notifyEmails.join(', '),
    [document.destination.notifyEmails],
  )

  function updateField(index: number, patch: Partial<FormFieldDef>) {
    setDocument((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    }))
  }

  function moveField(index: number, direction: -1 | 1) {
    setDocument((current) => {
      const target = index + direction
      if (target < 0 || target >= current.fields.length) return current
      const next = [...current.fields]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...current, fields: next }
    })
  }

  function removeField(index: number) {
    setDocument((current) => ({
      ...current,
      fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
    }))
  }

  function addField(type: FormFieldDef['type']) {
    setDocument((current) => ({ ...current, fields: [...current.fields, newField(type)] }))
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let nextDocument = document
    if (tab === 'advanced' && canAdvanced) {
      try {
        const parsed = JSON.parse(advancedText) as Record<string, unknown>
        nextDocument = normalizeFormBuilderDocument(parsed)
        setDocument(nextDocument)
      } catch {
        setError('Document is not valid JSON.')
        return
      }
    }

    const payloadDocument = formBuilderDocumentToRecord(nextDocument)

    setSaving(true)
    try {
      const res = await fetch(`/api/console/form-configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, document: payloadDocument }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        formConfig?: { updatedAt: string; document?: unknown; active?: boolean }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      const normalized = normalizeFormBuilderDocument(
        data?.formConfig?.document && typeof data.formConfig.document === 'object'
          ? (data.formConfig.document as Record<string, unknown>)
          : payloadDocument,
      )
      setDocument(normalized)
      setAdvancedText(JSON.stringify(formBuilderDocumentToRecord(normalized), null, 2))
      if (typeof data?.formConfig?.active === 'boolean') setActive(data.formConfig.active)
      setSuccess(
        `Saved at ${new Date(data?.formConfig?.updatedAt ?? Date.now()).toLocaleString()}`,
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
        Form type <code>{formType}</code> — configured here, reused on public form blocks without writing JSON.
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
            Advanced JSON
          </button>
        ) : null}
      </div>

      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={saving || readOnly}
        />{' '}
        Active
      </label>

      {tab === 'advanced' && canAdvanced ? (
        <label className="tma-console-label">
          Document (JSON)
          <textarea
            className="tma-console-textarea-json"
            value={advancedText}
            onChange={(e) => setAdvancedText(e.target.value)}
            disabled={saving || readOnly}
            spellCheck={false}
          />
        </label>
      ) : (
        <>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Form name
              <input
                className="tma-console-input"
                value={document.name}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, name: e.target.value }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Default width
              <select
                className="tma-console-input"
                value={document.layout.width}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      width: e.target.value as FormBuilderDocument['layout']['width'],
                    },
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
                <option value="full">Full width</option>
              </select>
            </label>
          </div>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Columns
              <select
                className="tma-console-input"
                value={String(document.layout.columns)}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      columns: e.target.value === '1' ? 1 : 2,
                    },
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="1">Single column</option>
                <option value="2">Two columns</option>
              </select>
            </label>
            <label className="tma-console-label">
              Autoresponder template
              <select
                className="tma-console-input"
                value={document.autoresponderTemplate == null ? '' : String(document.autoresponderTemplate)}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    autoresponderTemplate: e.target.value
                      ? Number.parseInt(e.target.value, 10)
                      : null,
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="">None</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.slug})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="tma-console-label">
            Intro text
            <textarea
              className="tma-console-textarea-prose"
              value={document.intro}
              onChange={(e) =>
                setDocument((current) => ({ ...current, intro: e.target.value }))
              }
              disabled={saving || readOnly}
              rows={3}
            />
          </label>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Submit label
              <input
                className="tma-console-input"
                value={document.submitLabel}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    submitLabel: e.target.value,
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Success message
              <input
                className="tma-console-input"
                value={document.successMessage}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    successMessage: e.target.value,
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
          </div>

          <label className="tma-console-label">
            Notify emails
            <input
              className="tma-console-input"
              value={notifyEmailsText}
              onChange={(e) =>
                setDocument((current) => ({
                  ...current,
                  destination: {
                    notifyEmails: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                }))
              }
              disabled={saving || readOnly}
              placeholder="name@example.com, sales@example.com"
            />
          </label>

          <div className="tma-console-field-row">
            <label className="tma-console-label tma-console-label--inline">
              <input
                type="checkbox"
                checked={document.spamProtection.requireCaptcha}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    spamProtection: { requireCaptcha: e.target.checked },
                  }))
                }
                disabled={saving || readOnly}
              />{' '}
              Require captcha
            </label>
            <label className="tma-console-label tma-console-label--inline">
              <input
                type="checkbox"
                checked={document.consent.enabled}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    consent: { ...current.consent, enabled: e.target.checked },
                  }))
                }
                disabled={saving || readOnly}
              />{' '}
              Show consent checkbox
            </label>
          </div>

          {document.consent.enabled ? (
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                Consent label
                <input
                  className="tma-console-input"
                  value={document.consent.label}
                  onChange={(e) =>
                    setDocument((current) => ({
                      ...current,
                      consent: { ...current.consent, label: e.target.value },
                    }))
                  }
                  disabled={saving || readOnly}
                />
              </label>
              <label className="tma-console-label tma-console-label--inline">
                <input
                  type="checkbox"
                  checked={document.consent.required}
                  onChange={(e) =>
                    setDocument((current) => ({
                      ...current,
                      consent: { ...current.consent, required: e.target.checked },
                    }))
                  }
                  disabled={saving || readOnly}
                />{' '}
                Consent required
              </label>
            </div>
          ) : null}

          <fieldset className="tma-console-fieldset" disabled={saving || readOnly}>
            <legend className="tma-console-subheading">Fields</legend>
            {document.fields.map((field, index) => (
              <div key={`${field.name}-${index}`} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">
                    {field.label || field.name || `Field ${index + 1}`}
                  </span>
                  <div className="tma-console-actions">
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveField(index, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveField(index, 1)} disabled={index === document.fields.length - 1}>
                      Down
                    </button>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removeField(index)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Label
                    <input
                      className="tma-console-input"
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, {
                          label: e.target.value,
                          name:
                            field.name.startsWith('field') || field.name.startsWith('section')
                              ? labelToFieldName(e.target.value)
                              : field.name,
                        })
                      }
                    />
                  </label>
                  <label className="tma-console-label">
                    Type
                    <select
                      className="tma-console-input"
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, {
                          type: e.target.value as FormFieldDef['type'],
                          width:
                            e.target.value === 'checkbox' || e.target.value === 'section'
                              ? 'full'
                              : field.width ?? 'half',
                        })
                      }
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Machine name
                    <input
                      className="tma-console-input"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                    />
                  </label>
                  {field.type !== 'checkbox' && field.type !== 'section' ? (
                    <label className="tma-console-label">
                      Width
                      <select
                        className="tma-console-input"
                        value={field.width ?? 'full'}
                        onChange={(e) =>
                          updateField(index, {
                            width: e.target.value as 'half' | 'full',
                          })
                        }
                      >
                        <option value="half">Half</option>
                        <option value="full">Full</option>
                      </select>
                    </label>
                  ) : null}
                </div>
                {field.type !== 'section' ? (
                  <>
                    <label className="tma-console-label">
                      Placeholder
                      <input
                        className="tma-console-input"
                        value={field.placeholder ?? ''}
                        onChange={(e) =>
                          updateField(index, { placeholder: e.target.value })
                        }
                      />
                    </label>
                    <label className="tma-console-label tma-console-label--inline">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />{' '}
                      Required
                    </label>
                  </>
                ) : null}
                <label className="tma-console-label">
                  Helper text
                  <input
                    className="tma-console-input"
                    value={field.helperText ?? ''}
                    onChange={(e) =>
                      updateField(index, { helperText: e.target.value })
                    }
                  />
                </label>
              </div>
            ))}
            <div className="tma-console-actions">
              <button type="button" className="tma-console-btn-secondary" onClick={() => addField('text')}>
                Add field
              </button>
              <button type="button" className="tma-console-btn-secondary" onClick={() => addField('textarea')}>
                Add textarea
              </button>
              <button type="button" className="tma-console-btn-secondary" onClick={() => addField('checkbox')}>
                Add checkbox
              </button>
              <button type="button" className="tma-console-btn-secondary" onClick={() => addField('section')}>
                Add section heading
              </button>
            </div>
          </fieldset>

          <div>
            <h2 className="tma-console-subheading">Preview</h2>
            <FormPreview document={document} />
          </div>
        </>
      )}

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
