'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

export function ConsoleLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      const r = await fetch('/api/console-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setError(
          typeof data.error === 'string' ? data.error : 'Sign-in failed',
        )
        setPending(false)
        return
      }
      router.replace('/console')
      router.refresh()
    } catch {
      setError('Network error')
      setPending(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">
        <span>Email</span>
        <input
          className="tma-console-input"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
          disabled={pending}
        />
      </label>
      <label className="tma-console-label">
        <span>Password</span>
        <input
          className="tma-console-input"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          required
          disabled={pending}
        />
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <button className="tma-console-submit" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
