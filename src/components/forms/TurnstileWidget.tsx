'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
        },
      ) => string
      reset?: (id: string) => void
    }
  }
}

type Props = {
  onToken: (token: string | null) => void
}

/**
 * Loads Cloudflare Turnstile when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
 */
export function TurnstileWidget({ onToken }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !ref.current) return

    let cancelled = false
    function mount() {
      if (cancelled || !ref.current || !window.turnstile || !siteKey) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey as string,
        callback: (t) => {
          onToken(t)
          setError(null)
        },
        'error-callback': () => {
          onToken(null)
          setError('Captcha could not load')
        },
        'expired-callback': () => {
          onToken(null)
        },
      })
    }

    if (window.turnstile) {
      mount()
      return () => {
        cancelled = true
      }
    }

    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    s.async = true
    s.onload = () => {
      if (!cancelled) mount()
    }
    s.onerror = () => {
      setError('Captcha script blocked')
      onToken(null)
    }
    document.body.appendChild(s)

    return () => {
      cancelled = true
      s.remove()
    }
  }, [siteKey, onToken])

  if (!siteKey) return null

  return (
    <div className="tma-turnstile">
      <div ref={ref} />
      {error ? (
        <p className="book-flow__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
