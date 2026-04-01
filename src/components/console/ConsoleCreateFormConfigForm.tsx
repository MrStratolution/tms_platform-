'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { defaultFormBuilderDocument, formBuilderDocumentToRecord } from '@/lib/formConfigDocument'
import { readResponseJson } from '@/lib/safeJson'

const FORM_PRESETS = [
  {
    formType: 'contact',
    label: 'Contact form',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Contact form' })
      doc.intro = 'Tell us what you need and we will route your inquiry.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'lastName', type: 'text', label: 'Last name', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'company', type: 'text', label: 'Company', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'message', type: 'textarea', label: 'How can we help?', required: true, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
  {
    formType: 'discovery',
    label: 'Discovery form',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Discovery form' })
      doc.intro = 'Share your growth goals and current blockers.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'lastName', type: 'text', label: 'Last name', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'company', type: 'text', label: 'Company', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'stage', type: 'text', label: 'Business stage', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'goal', type: 'textarea', label: 'Primary objective', required: true, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
  {
    formType: 'audit',
    label: 'Audit request',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Audit request' })
      doc.intro = 'Request a focused audit and share the context we need to prepare.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'company', type: 'text', label: 'Company', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'website', type: 'url', label: 'Website', required: true, placeholder: 'https://', helperText: '', width: 'half' },
        { name: 'scope', type: 'textarea', label: 'Audit focus', required: true, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
  {
    formType: 'product-inquiry',
    label: 'Product inquiry',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Product inquiry' })
      doc.intro = 'Ask about a specific product, implementation, or pricing detail.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'company', type: 'text', label: 'Company', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'productName', type: 'text', label: 'Product of interest', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'message', type: 'textarea', label: 'Question', required: true, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
  {
    formType: 'partner',
    label: 'Partner form',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Partner form' })
      doc.intro = 'Introduce your company and the kind of partnership you have in mind.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'lastName', type: 'text', label: 'Last name', required: false, placeholder: '', helperText: '', width: 'half' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'company', type: 'text', label: 'Company', required: true, placeholder: '', helperText: '', width: 'half' },
        { name: 'proposal', type: 'textarea', label: 'Partnership idea', required: true, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
  {
    formType: 'landing',
    label: 'Landing page form',
    build: () => {
      const doc = defaultFormBuilderDocument({ name: 'Landing page form' })
      doc.layout.width = 'narrow'
      doc.layout.columns = 1
      doc.intro = 'Leave your details and we will follow up with the right next step.'
      doc.fields = [
        { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', helperText: '', width: 'full' },
        { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', helperText: '', width: 'full' },
        { name: 'company', type: 'text', label: 'Company', required: false, placeholder: '', helperText: '', width: 'full' },
      ]
      return doc
    },
  },
] as const

function normalizeFormTypeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function nextAvailableFormType(base: string, existing: string[]): string {
  const normalizedBase = normalizeFormTypeKey(base) || 'form'
  const set = new Set(existing.map((item) => normalizeFormTypeKey(item)).filter(Boolean))
  if (!set.has(normalizedBase)) return normalizedBase
  let index = 2
  while (set.has(`${normalizedBase}-${index}`)) index += 1
  return `${normalizedBase}-${index}`
}

export function ConsoleCreateFormConfigForm() {
  const router = useRouter()
  const [presetKey, setPresetKey] = useState<(typeof FORM_PRESETS)[number]['formType']>('contact')
  const [formType, setFormType] = useState('contact')
  const [existingFormTypes, setExistingFormTypes] = useState<string[]>([])
  const [keyTouched, setKeyTouched] = useState(false)
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPreset = useMemo(
    () => FORM_PRESETS.find((preset) => preset.formType === presetKey) ?? FORM_PRESETS[0],
    [presetKey],
  )
  const suggestedFormType = useMemo(
    () => nextAvailableFormType(presetKey, existingFormTypes),
    [existingFormTypes, presetKey],
  )
  const normalizedFormType = useMemo(() => normalizeFormTypeKey(formType), [formType])
  const isDuplicate = useMemo(
    () => existingFormTypes.some((item) => normalizeFormTypeKey(item) === normalizedFormType),
    [existingFormTypes, normalizedFormType],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/form-configs', { credentials: 'same-origin' })
        const data = await readResponseJson<{ formConfigs?: { formType: string }[] }>(res)
        if (!cancelled && res.ok) {
          setExistingFormTypes((data?.formConfigs ?? []).map((item) => item.formType))
        }
      } catch {
        if (!cancelled) setExistingFormTypes([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!keyTouched) {
      setFormType(suggestedFormType)
    }
  }, [keyTouched, suggestedFormType])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextFormType = normalizedFormType
    if (!nextFormType) {
      setError('Enter a form key.')
      return
    }
    if (!/^[a-z][a-z0-9_-]*$/.test(nextFormType)) {
      setError('Form key must start with a letter and use only lowercase letters, numbers, hyphens, or underscores.')
      return
    }
    if (isDuplicate) {
      setError(`"${nextFormType}" already exists. Use a different key.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const document = formBuilderDocumentToRecord(selectedPreset.build())
      const res = await fetch('/api/console/form-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: nextFormType,
          active,
          document,
        }),
      })
      const data = await readResponseJson<{ error?: string; formConfig?: { id: number } }>(res)
      if (!res.ok || !data?.formConfig?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/forms/${data.formConfig.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <p className="tma-console-lead">
        Start from a guided preset. After creation, you can edit fields, layout, consent copy, notifications, and width without touching JSON.
      </p>
      <label className="tma-console-label">
        Starter preset
        <select
          className="tma-console-input"
          value={presetKey}
          onChange={(event) => {
            const next = event.target.value as (typeof FORM_PRESETS)[number]['formType']
            setPresetKey(next)
            if (!keyTouched) {
              setFormType(nextAvailableFormType(next, existingFormTypes))
            }
          }}
          disabled={busy}
        >
          {FORM_PRESETS.map((preset) => (
            <option key={preset.formType} value={preset.formType}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Form type key
        <input
          className="tma-console-input"
          value={formType}
          onChange={(event) => {
            setKeyTouched(true)
            setFormType(event.target.value)
          }}
          required
          disabled={busy}
          placeholder="e.g. contact, discovery, audit"
          autoComplete="off"
        />
      </label>
      <p className="tma-console-muted" style={{ marginTop: '-0.5rem' }}>
        Suggested key: <strong>{suggestedFormType}</strong>
        {isDuplicate && normalizedFormType
          ? ` — "${normalizedFormType}" is already in use.`
          : ''}
      </p>
      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          disabled={busy}
        />{' '}
        Active
      </label>
      <p className="tma-console-muted">
        Preset: <strong>{selectedPreset.label}</strong>. The full form builder opens on the next screen.
      </p>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create form config'}
        </button>
      </div>
    </form>
  )
}
