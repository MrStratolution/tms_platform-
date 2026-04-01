'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  /** `blur` = slower editorial reveal */
  variant?: 'fade' | 'blur'
}

export function Reveal({ children, className, variant = 'fade' }: Props) {
  const reduceMotion = useReducedMotion()
  const isBlur = variant === 'blur'

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={
        isBlur
          ? { opacity: 0, y: 24, filter: 'blur(12px)' }
          : { opacity: 0, y: 14 }
      }
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: isBlur ? 0.85 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
