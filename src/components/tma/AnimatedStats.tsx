'use client'

import { useEffect, useRef, useState } from 'react'

import { useMotionEnabled } from '@/components/motion/useMotionEnabled'

type Item = { value: string; suffix?: string | null; label: string; id?: string | null }

function splitNumeric(value: string): {
  before: string
  n: number
  after: string
} | null {
  const m = value.match(/^([^0-9]*)(\d+\.?\d*)(.*)$/)
  if (!m?.[2]) return null
  const n = parseFloat(m[2])
  if (!Number.isFinite(n)) return null
  return { before: m[1] ?? '', n, after: m[3] ?? '' }
}

function StatFigure({
  value,
  suffix,
  label,
}: {
  value: string
  suffix?: string | null
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const parts = splitNumeric(value)
  const suf = suffix?.trim() ?? ''
  const motionEnabled = useMotionEnabled()
  const finalDisplay = parts ? `${parts.before}${parts.n}${parts.after}${suf}` : `${value}${suf}`

  const [display, setDisplay] = useState(finalDisplay)

  useEffect(() => {
    const el = ref.current
    if (!el || !parts || !motionEnabled) {
      setDisplay(finalDisplay)
      return
    }

    const rect = el.getBoundingClientRect()
    const viewportHeight = window.innerHeight || 0
    if (rect.top <= viewportHeight * 0.85) {
      setDisplay(finalDisplay)
      return
    }

    const { before, n, after } = parts
    const decimals = n % 1 !== 0 ? 1 : 0
    const startDisplay = `${before}0${after}${suf}`
    let frame = 0
    let startedAt = 0

    setDisplay(startDisplay)

    const render = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp
      const progress = Math.min((timestamp - startedAt) / 1350, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = n * eased
      const mid = decimals > 0 ? current.toFixed(decimals) : String(Math.round(current))
      setDisplay(`${before}${mid}${after}${suf}`)
      if (progress < 1) frame = window.requestAnimationFrame(render)
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        obs.disconnect()
        frame = window.requestAnimationFrame(render)
      },
      { threshold: 0.15 },
    )

    obs.observe(el)
    return () => {
      obs.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [finalDisplay, motionEnabled, parts, suf])

  return (
    <div ref={ref} className="tma-stat">
      <span className="tma-stat__value">{display}</span>
      <span className="tma-stat__label">{label}</span>
    </div>
  )
}

type Props = {
  items: Item[]
  variant?: 'default' | 'compact' | null
}

export function AnimatedStats({ items, variant }: Props) {
  if (!items?.length) return null
  return (
    <div className={`tma-stats${variant === 'compact' ? ' tma-stats--compact' : ''}`}>
      {items.map((item, i) => (
        <StatFigure
          key={item.id ?? `${item.label}-${i}`}
          value={item.value}
          suffix={item.suffix}
          label={item.label}
        />
      ))}
    </div>
  )
}
