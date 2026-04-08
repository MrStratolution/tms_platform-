'use client'

import { useEffect, useState } from 'react'

import { isMotionAllowed } from './motionRuntime'

export function useMotionEnabled() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const body = document.body
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      setEnabled(isMotionAllowed(document, window))
    }

    sync()
    query.addEventListener('change', sync)

    const observer = body
      ? new MutationObserver(sync)
      : null

    observer?.observe(body, {
      attributes: true,
      attributeFilter: ['data-tma-motion', 'data-tma-motion-reduce'],
    })

    return () => {
      query.removeEventListener('change', sync)
      observer?.disconnect()
    }
  }, [])

  return enabled
}
