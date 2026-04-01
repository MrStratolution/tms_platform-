'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

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

  const [display, setDisplay] = useState(() => {
    if (!parts) return `${value}${suf}`
    return `${parts.before}0${parts.after}${suf}`
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !parts) return

    let ctrl: ReturnType<typeof animate> | undefined
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        obs.disconnect()
        const { before, n, after } = parts
        const dec = n % 1 !== 0 ? 1 : 0
        ctrl = animate(0, n, {
          duration: 1.35,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (v) => {
            const mid = dec > 0 ? v.toFixed(1) : String(Math.round(v))
            setDisplay(`${before}${mid}${after}${suf}`)
          },
        })
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      ctrl?.stop()
    }
  }, [parts, suf])

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
