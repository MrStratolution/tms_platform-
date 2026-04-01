'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'
import type { BookingProfile } from '@/types/cms'

type Props = {
  profile: BookingProfile
  width?: 'narrow' | 'default' | 'wide' | 'full' | null
}

export function BookingBlock({ profile, width = 'default' }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const profileWidth =
    width && width !== 'default'
      ? width
      : typeof profile.layout === 'object' &&
          profile.layout != null &&
          'width' in profile.layout &&
          ['narrow', 'default', 'wide', 'full'].includes(
            String((profile.layout as { width?: unknown }).width),
          )
        ? (profile.layout as { width: 'narrow' | 'default' | 'wide' | 'full' }).width
        : 'default'
  const ctaLabel = profile.ctaLabel?.trim() || 'Choose a time'

  async function startBooking() {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/bookings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingProfileId: profile.id }),
      })
      const data = await readResponseJson<{
        mode?: string
        path?: string
        url?: string
        error?: string
      }>(res)
      if (!res.ok) {
        setStatus('error')
        setError(data?.error ?? 'Could not start booking')
        return
      }
      if (data?.mode === 'internal' && data.path) {
        router.push(data.path)
        return
      }
      const target = data?.url
      if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
        window.location.assign(target)
        return
      }
      if (target?.startsWith('/')) {
        router.push(target)
        return
      }
      setStatus('error')
      setError('No booking URL returned')
    } catch {
      setStatus('error')
      setError('Network error')
    }
  }

  return (
    <div className={`block-booking block-booking--${profileWidth}`}>
      <h2 className="block-booking__title">Book a time</h2>
      <p className="tma-muted">{profile.name}</p>
      {profile.helperText?.trim() ? (
        <p className="tma-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
          {profile.helperText}
        </p>
      ) : null}
      {error ? (
        <p className="book-flow__error" role="alert">
          {error}
        </p>
      ) : null}
      <motion.button
        type="button"
        className="tma-btn tma-btn--primary book-flow__submit"
        onClick={() => void startBooking()}
        disabled={status === 'loading'}
        whileHover={status === 'loading' ? undefined : { y: -2 }}
        whileTap={status === 'loading' ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {status === 'loading' ? 'Opening…' : ctaLabel}
      </motion.button>
    </div>
  )
}
