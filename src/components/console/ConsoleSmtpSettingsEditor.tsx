'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type SmtpSettings = {
  id: number
  host: string
  port: number
  secure: boolean
  username: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  active: boolean
  hasPassword: boolean
  updatedAt: string
}

type Props = {
  initialSettings: SmtpSettings | null
  canManage: boolean
  uiLocale: 'de' | 'en'
}

const COPY = {
  de: {
    title: 'SMTP-Einstellungen',
    lead:
      'Diese Einstellungen steuern den Versand von Formular- und System-E-Mails. Das Passwort wird verschlüsselt gespeichert und nie erneut im UI angezeigt.',
    host: 'Host',
    port: 'Port',
    secure: 'Secure / SSL',
    username: 'Benutzername',
    password: 'Passwort',
    passwordHintSaved: 'Passwort ist gespeichert. Nur ausfüllen, wenn du es ersetzen willst.',
    fromName: 'Absendername',
    fromEmail: 'Absender-E-Mail',
    replyTo: 'Reply-to',
    active: 'SMTP aktiv',
    save: 'Einstellungen speichern',
    saving: 'Speichert…',
    testTitle: 'Test-E-Mail senden',
    testRecipient: 'Empfänger',
    testButton: 'Test senden',
    testSending: 'Sendet…',
    readOnly: 'Nur Admins dürfen SMTP-Einstellungen verwalten.',
  },
  en: {
    title: 'SMTP settings',
    lead:
      'These settings control form and system email delivery. The password is stored encrypted and is never shown again in the UI.',
    host: 'Host',
    port: 'Port',
    secure: 'Secure / SSL',
    username: 'Username',
    password: 'Password',
    passwordHintSaved: 'A password is already stored. Only fill this in to replace it.',
    fromName: 'From name',
    fromEmail: 'From email',
    replyTo: 'Reply-to',
    active: 'SMTP active',
    save: 'Save settings',
    saving: 'Saving…',
    testTitle: 'Send test email',
    testRecipient: 'Recipient',
    testButton: 'Send test',
    testSending: 'Sending…',
    readOnly: 'Only admins can manage SMTP settings.',
  },
} as const

export function ConsoleSmtpSettingsEditor(props: Props) {
  const { initialSettings, canManage, uiLocale } = props
  const t = COPY[uiLocale]

  const [host, setHost] = useState(initialSettings?.host ?? '')
  const [port, setPort] = useState(String(initialSettings?.port ?? 587))
  const [secure, setSecure] = useState(initialSettings?.secure ?? false)
  const [username, setUsername] = useState(initialSettings?.username ?? '')
  const [password, setPassword] = useState('')
  const [fromName, setFromName] = useState(initialSettings?.fromName ?? '')
  const [fromEmail, setFromEmail] = useState(initialSettings?.fromEmail ?? '')
  const [replyTo, setReplyTo] = useState(initialSettings?.replyTo ?? '')
  const [active, setActive] = useState(initialSettings?.active ?? false)
  const [hasPassword, setHasPassword] = useState(initialSettings?.hasPassword ?? false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testRecipient, setTestRecipient] = useState(initialSettings?.fromEmail ?? '')
  const [testError, setTestError] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canManage) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const res = await fetch('/api/console/email-system/smtp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number.parseInt(port, 10) || 587,
          secure,
          username,
          password: password.trim() || undefined,
          fromName,
          fromEmail,
          replyTo: replyTo.trim() || '',
          active,
        }),
      })
      const data = await readResponseJson<{
        error?: string
        smtpSettings?: { updatedAt?: string; hasPassword?: boolean }
      }>(res)
      if (!res.ok) {
        setSaveError(data?.error ?? 'Save failed')
        return
      }
      setPassword('')
      setHasPassword(data?.smtpSettings?.hasPassword ?? true)
      setSaveSuccess(
        `Saved at ${new Date(
          data?.smtpSettings?.updatedAt ?? Date.now(),
        ).toLocaleString()}`,
      )
    } catch {
      setSaveError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  async function onSendTest(event: React.FormEvent) {
    event.preventDefault()
    if (!canManage) return
    setSendingTest(true)
    setTestError(null)
    setTestSuccess(null)

    try {
      const res = await fetch('/api/console/email-system/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testRecipient }),
      })
      const data = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) {
        setTestError(data?.error ?? 'Test send failed')
        return
      }
      setTestSuccess('Test email sent successfully.')
    } catch {
      setTestError('Network error while sending the test email.')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="tma-console-settings-block">
      <h2 className="tma-console-subheading">{t.title}</h2>
      <p className="tma-console-note">{t.lead}</p>

      {!canManage ? (
        <p className="tma-console-env-warning" role="status">
          <strong>Read only.</strong> {t.readOnly}
        </p>
      ) : null}

      <form className="tma-console-form" onSubmit={onSave}>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            {t.host}
            <input
              className="tma-console-input"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              disabled={saving || !canManage}
            />
          </label>
          <label className="tma-console-label">
            {t.port}
            <input
              className="tma-console-input"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(event) => setPort(event.target.value)}
              disabled={saving || !canManage}
            />
          </label>
        </div>

        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={secure}
            onChange={(event) => setSecure(event.target.checked)}
            disabled={saving || !canManage}
          />
          <span>{t.secure}</span>
        </label>

        <div className="tma-console-field-row">
          <label className="tma-console-label">
            {t.username}
            <input
              className="tma-console-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={saving || !canManage}
            />
          </label>
          <label className="tma-console-label">
            {t.password}
            <input
              className="tma-console-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={saving || !canManage}
              placeholder={hasPassword ? '••••••••' : ''}
            />
            {hasPassword ? (
              <small className="tma-console-hint">{t.passwordHintSaved}</small>
            ) : null}
          </label>
        </div>

        <div className="tma-console-field-row">
          <label className="tma-console-label">
            {t.fromName}
            <input
              className="tma-console-input"
              value={fromName}
              onChange={(event) => setFromName(event.target.value)}
              disabled={saving || !canManage}
            />
          </label>
          <label className="tma-console-label">
            {t.fromEmail}
            <input
              className="tma-console-input"
              type="email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              disabled={saving || !canManage}
            />
          </label>
        </div>

        <label className="tma-console-label">
          {t.replyTo}
          <input
            className="tma-console-input"
            type="email"
            value={replyTo}
            onChange={(event) => setReplyTo(event.target.value)}
            disabled={saving || !canManage}
          />
        </label>

        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={saving || !canManage}
          />
          <span>{t.active}</span>
        </label>

        {saveError ? <p className="tma-console-error">{saveError}</p> : null}
        {saveSuccess ? <p className="tma-console-success">{saveSuccess}</p> : null}

        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving || !canManage}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </form>

      <form className="tma-console-form" onSubmit={onSendTest} style={{ marginTop: '1.5rem' }}>
        <h3 className="tma-console-subheading" style={{ marginBottom: '0.5rem' }}>
          {t.testTitle}
        </h3>
        <label className="tma-console-label">
          {t.testRecipient}
          <input
            className="tma-console-input"
            type="email"
            value={testRecipient}
            onChange={(event) => setTestRecipient(event.target.value)}
            disabled={sendingTest || !canManage}
          />
        </label>

        {testError ? <p className="tma-console-error">{testError}</p> : null}
        {testSuccess ? <p className="tma-console-success">{testSuccess}</p> : null}

        <div className="tma-console-actions">
          <button
            type="submit"
            className="tma-console-btn-secondary"
            disabled={sendingTest || !canManage}
          >
            {sendingTest ? t.testSending : t.testButton}
          </button>
        </div>
      </form>
    </div>
  )
}
