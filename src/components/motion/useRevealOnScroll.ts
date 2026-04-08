'use client'

import { useEffect, useRef, useState } from 'react'

import { useMotionEnabled } from './useMotionEnabled'

type Options = {
  disabled?: boolean
  once?: boolean
  threshold?: number
  rootMargin?: string
}

type RevealState = 'idle' | 'hidden' | 'visible'

export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(options: Options = {}) {
  const motionEnabled = useMotionEnabled()
  const disabled = options.disabled === true || !motionEnabled
  const ref = useRef<T | null>(null)
  const [revealed, setRevealed] = useState(disabled)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (disabled) {
      setRevealed(true)
      setArmed(false)
      return
    }

    const element = ref.current
    if (!element) return

    const threshold = options.threshold ?? 0.16
    const viewportHeight = window.innerHeight || 0
    const rect = element.getBoundingClientRect()
    const visibleNow = rect.top <= viewportHeight * (1 - threshold)

    if (visibleNow) {
      setRevealed(true)
      setArmed(true)
      return
    }

    setRevealed(false)
    setArmed(true)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        setRevealed(true)
        if (options.once !== false) observer.disconnect()
      },
      {
        threshold,
        rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
      },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [disabled, motionEnabled, options.once, options.rootMargin, options.threshold])

  const state: RevealState = revealed ? 'visible' : armed ? 'hidden' : 'idle'
  return { ref, revealed, state, motionEnabled: !disabled }
}
