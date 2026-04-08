'use client'

import { useEffect, useMemo, useState } from 'react'

import { useMotionEnabled } from './useMotionEnabled'

type Options = {
  intervalMs?: number
  enabled?: boolean
}

export function useRotatingWords(words: string[], options: Options = {}) {
  const motionEnabled = useMotionEnabled()
  const normalized = useMemo(
    () => words.map((word) => word.trim()).filter(Boolean),
    [words],
  )
  const [index, setIndex] = useState(0)
  const enabled = (options.enabled ?? true) && motionEnabled && normalized.length > 1

  useEffect(() => {
    setIndex(0)
  }, [normalized])

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % normalized.length)
    }, options.intervalMs ?? 2400)
    return () => window.clearInterval(id)
  }, [enabled, normalized.length, options.intervalMs])

  return {
    currentWord: normalized[index] ?? normalized[0] ?? '',
    index,
    enabled,
  }
}
