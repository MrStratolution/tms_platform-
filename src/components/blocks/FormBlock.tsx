'use client'

import { useMemo, useState } from 'react'

import { TurnstileWidget } from '@/components/forms/TurnstileWidget'
import { parseFormFieldDefinitions } from '@/lib/formFields'
import { readResponseJson } from '@/lib/safeJson'
import type { FormConfig } from '@/types/cms'

type Props = {
  formConfig: FormConfig
  pageSlug: string
  serviceInterestSlug?: string
  industrySlug?: string
  width?: 'narrow' | 'default' | 'wide' | 'full' | null
}

const USE_TURNSTILE_UI = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

export function FormBlock({
  formConfig,
  pageSlug,
  serviceInterestSlug,
  industrySlug,
  width = 'default',
}: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const fieldDefs = useMemo(
    () => parseFormFieldDefinitions(formConfig.fields),
    [formConfig.fields],
  )

  const customFieldsMissingEmail =
    Boolean(fieldDefs?.length) &&
    !fieldDefs!.some((f) => f.name === 'email' && f.type === 'email')

  const formWidth =
    width && width !== 'default'
      ? width
      : typeof formConfig.layout === 'object' &&
          formConfig.layout != null &&
          'width' in formConfig.layout &&
          (formConfig.layout as { width?: unknown }).width &&
          ['narrow', 'default', 'wide', 'full'].includes(
            String((formConfig.layout as { width?: unknown }).width),
          )
        ? (formConfig.layout as { width: 'narrow' | 'default' | 'wide' | 'full' }).width
        : 'default'

  const formColumns =
    typeof formConfig.layout === 'object' &&
    formConfig.layout != null &&
    'columns' in formConfig.layout &&
    Number((formConfig.layout as { columns?: unknown }).columns) === 1
      ? 1
      : 2

  const submitLabel = formConfig.submitLabel?.trim() || 'Submit'
  const successMessage =
    formConfig.successMessage?.trim() || 'Thank you. We will be in touch.'
  const consent =
    typeof formConfig.consent === 'object' && formConfig.consent != null
      ? (formConfig.consent as {
          enabled?: unknown
          label?: unknown
          required?: unknown
        })
      : null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)
    const fd = new FormData(e.currentTarget)

    const extras: Record<string, string> = {}
    if (fieldDefs?.length) {
      for (const f of fieldDefs) {
        if (f.type === 'checkbox') {
          extras[f.name] = fd.get(f.name) === 'on' ? 'on' : ''
        } else {
          extras[f.name] = (fd.get(f.name) as string) ?? ''
        }
      }
    }

    const emailVal = (fd.get('email') as string) || ''

    const body: Record<string, unknown> = {
      formType: formConfig.formType,
      sourcePageSlug: pageSlug,
      lead: {
        firstName: (fd.get('firstName') as string) || undefined,
        lastName: (fd.get('lastName') as string) || undefined,
        email: emailVal,
        phone: (fd.get('phone') as string) || undefined,
        company: (fd.get('company') as string) || undefined,
        website: (fd.get('website') as string) || undefined,
      },
      context: {
        serviceInterestSlug,
        industrySlug,
      },
      consentMarketing: fd.get('consentMarketing') === 'on',
      turnstileToken: turnstileToken ?? undefined,
    }

    if (fieldDefs?.length) {
      body.extras = extras
    }

    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await readResponseJson<{ error?: string; duplicate?: boolean }>(res)
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error ?? 'Something went wrong')
        setTurnstileToken(null)
        return
      }
      setStatus('success')
      setMessage(
        data?.duplicate
          ? "You're already on our list — thank you."
          : successMessage,
      )
      e.currentTarget.reset()
      setTurnstileToken(null)
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
      setTurnstileToken(null)
    }
  }

  return (
    <div className={`block-form block-form--${formWidth}`}>
      <h2 className="block-form__title">{formConfig.name}</h2>
      {formConfig.intro?.trim() ? (
        <p className="tma-muted" style={{ margin: '0 0 1.25rem' }}>
          {formConfig.intro}
        </p>
      ) : null}
      {status === 'success' ? (
        <p className="block-form__success" role="status">
          {message}
        </p>
      ) : (
        <form className="block-form__form" onSubmit={onSubmit}>
          {fieldDefs?.length ? (
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: formColumns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              }}
            >
              {customFieldsMissingEmail ? (
                <label className="book-flow__field" style={{ gridColumn: '1 / -1' }}>
                  <span>Email *</span>
                  <input name="email" type="email" required autoComplete="email" />
                </label>
              ) : null}
              {fieldDefs.map((f) => {
                const id = `f-${formConfig.id}-${f.name}`
                if (f.type === 'section') {
                  return (
                    <div key={f.name} style={{ gridColumn: '1 / -1', paddingTop: '0.25rem' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--tma-lime)',
                        }}
                      >
                        {f.label}
                      </p>
                      {f.helperText?.trim() ? (
                        <p className="tma-muted" style={{ margin: '0.35rem 0 0' }}>
                          {f.helperText}
                        </p>
                      ) : null}
                    </div>
                  )
                }
                const colSpan =
                  formColumns === 2 && f.width === 'half' ? 'span 1' : '1 / -1'
                if (f.type === 'textarea') {
                  return (
                    <label
                      key={f.name}
                      className="book-flow__field"
                      htmlFor={id}
                      style={{ gridColumn: colSpan }}
                    >
                      <span>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </span>
                      <textarea
                        id={id}
                        name={f.name}
                        required={f.required}
                        placeholder={f.placeholder}
                        rows={4}
                      />
                      {f.helperText?.trim() ? (
                        <small className="tma-muted">{f.helperText}</small>
                      ) : null}
                    </label>
                  )
                }
                if (f.type === 'checkbox') {
                  return (
                    <label
                      key={f.name}
                      className="block-form__check"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <input id={id} name={f.name} type="checkbox" required={f.required} />
                      <span>{f.label}</span>
                    </label>
                  )
                }
                return (
                  <label
                    key={f.name}
                    className="book-flow__field"
                    htmlFor={id}
                    style={{ gridColumn: colSpan }}
                  >
                    <span>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </span>
                    <input
                      id={id}
                      name={f.name}
                      type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'url' ? 'url' : 'text'}
                      required={f.required}
                      placeholder={f.placeholder}
                      autoComplete={f.name}
                    />
                    {f.helperText?.trim() ? (
                      <small className="tma-muted">{f.helperText}</small>
                    ) : null}
                  </label>
                )
              })}
            </div>
          ) : (
            <>
              <div className="book-flow__row">
                <label className="book-flow__field">
                  <span>First name</span>
                  <input name="firstName" type="text" autoComplete="given-name" />
                </label>
                <label className="book-flow__field">
                  <span>Last name</span>
                  <input name="lastName" type="text" autoComplete="family-name" />
                </label>
              </div>
              <label className="book-flow__field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="book-flow__field">
                <span>Phone</span>
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
              <label className="book-flow__field">
                <span>Company</span>
                <input name="company" type="text" autoComplete="organization" />
              </label>
              <label className="book-flow__field">
                <span>Website</span>
                <input name="website" type="url" autoComplete="url" />
              </label>
            </>
          )}
          {consent?.enabled !== false ? (
            <label className="block-form__check">
              <input name="consentMarketing" type="checkbox" required={Boolean(consent?.required)} />
              <span>
                {typeof consent?.label === 'string' && consent.label.trim()
                  ? consent.label
                  : 'Keep me updated (optional)'}
              </span>
            </label>
          ) : null}
          {USE_TURNSTILE_UI ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
          {status === 'error' && message ? (
            <p className="book-flow__error" role="alert">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            className="tma-btn tma-btn--primary book-flow__submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending…' : submitLabel}
          </button>
        </form>
      )}
    </div>
  )
}
