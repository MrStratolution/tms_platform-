'use client'

import { useEffect } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function isSiteMotionEnabled(doc: Document | null | undefined): boolean {
  return doc?.body?.dataset.tmaMotion !== 'off'
}

export function isReducedMotionPreferred(win: Window | null | undefined): boolean {
  return Boolean(win?.matchMedia?.(REDUCED_MOTION_QUERY).matches)
}

export function isMotionAllowed(doc: Document | null | undefined, win: Window | null | undefined): boolean {
  return isSiteMotionEnabled(doc) && !isReducedMotionPreferred(win)
}

export function MotionRuntime() {
  useEffect(() => {
    const body = document.body
    if (!body) return

    const query = window.matchMedia(REDUCED_MOTION_QUERY)

    const sync = () => {
      body.dataset.tmaMotionReady = 'true'
      body.dataset.tmaMotionReduce = query.matches ? 'true' : 'false'
    }

    sync()
    query.addEventListener('change', sync)

    return () => {
      query.removeEventListener('change', sync)
      delete body.dataset.tmaMotionReady
      delete body.dataset.tmaMotionReduce
    }
  }, [])

  return null
}
