'use client'

import Lenis from 'lenis'
import { useEffect, type ReactNode } from 'react'

import { useMotionEnabled } from '@/components/motion/useMotionEnabled'

export function SmoothScrollProvider(props: { children: ReactNode }) {
  const { children } = props
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    if (!motionEnabled) return

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      gestureOrientation: 'vertical',
    })

    let frameId = 0
    const onFrame = (time: number) => {
      lenis.raf(time)
      frameId = window.requestAnimationFrame(onFrame)
    }

    frameId = window.requestAnimationFrame(onFrame)

    return () => {
      window.cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [motionEnabled])

  return <>{children}</>
}
