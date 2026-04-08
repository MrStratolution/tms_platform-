'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollDirection = 'up' | 'down' | null

type ScrollState = {
  y: number
  scrolled: boolean
  direction: ScrollDirection
}

type Options = {
  threshold?: number
}

export function useScrollState(options: Options = {}): ScrollState {
  const threshold = options.threshold ?? 24
  const directionRef = useRef<ScrollDirection>(null)
  const [state, setState] = useState<ScrollState>({
    y: 0,
    scrolled: false,
    direction: null,
  })

  useEffect(() => {
    let frame = 0
    let lastY = window.scrollY

    const commit = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY
      const direction: ScrollDirection =
        Math.abs(delta) < 4 ? directionRef.current : delta > 0 ? 'down' : 'up'
      lastY = y
      directionRef.current = direction
      setState({
        y,
        scrolled: y > threshold,
        direction,
      })
    }

    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(commit)
    }

    commit()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [threshold])

  return state
}
