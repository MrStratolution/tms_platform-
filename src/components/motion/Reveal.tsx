'use client'

import { createElement } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'

import { useRevealOnScroll } from './useRevealOnScroll'

/**
 * Reveal variant → maps to `.tma-reveal--{variant}` CSS class.
 *
 * fade      standard fade + translateY (default)
 * blur      fade + blur-in (editorial / slower)
 * slide-up  pronounced upward slide + fade (stats, cards)
 * subtle    opacity-only fade, no position movement
 * stagger   children animate in sequence (use on grid/list wrappers)
 * none      no animation, renders immediately
 */
export type RevealVariant =
  | 'fade'
  | 'blur'
  | 'slide-up'
  | 'scale-in'
  | 'subtle'
  | 'stagger'
  | 'none'
type HtmlTag = keyof HTMLElementTagNameMap

type Props = {
  children: ReactNode
  className?: string
  variant?: RevealVariant
  /**
   * Delay in milliseconds before the reveal animation starts.
   * Useful for choreographing adjacent sections. Ignored when variant='none'.
   */
  delay?: number
  as?: HtmlTag
}

const THRESHOLD_BY_VARIANT: Partial<Record<RevealVariant, number>> = {
  blur: 0.1,
  'slide-up': 0.12,
  'scale-in': 0.12,
  stagger: 0.08,
}

export function Reveal({ children, className, variant = 'fade', delay, as: Tag = 'div' }: Props) {
  const { ref, state, motionEnabled } = useRevealOnScroll<HTMLElement>({
    disabled: variant === 'none',
    threshold: THRESHOLD_BY_VARIANT[variant] ?? 0.16,
  })

  const style: CSSProperties | undefined =
    delay && delay > 0 && variant !== 'none'
      ? { transitionDelay: `${delay}ms` }
      : undefined

  return createElement(
    Tag,
    {
      ref: ref as Ref<HTMLElement>,
      className: `tma-reveal tma-reveal--${variant}${className ? ` ${className}` : ''}`,
      'data-reveal-state': motionEnabled ? state : 'visible',
      style,
    },
    children,
  )
}
