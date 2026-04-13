'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'

import { shouldUseCardRail, type CardRailVariant } from '@/lib/cardRail'

type Props = {
  itemCount: number
  variant: CardRailVariant
  listClassName: string
  ariaLabel: string
  children: ReactNode
  forceRail?: boolean
}

function readGapPx(node: HTMLElement | null): number {
  if (!node) return 0
  const styles = window.getComputedStyle(node)
  const raw = styles.columnGap || styles.gap || '0'
  const next = Number.parseFloat(raw)
  return Number.isFinite(next) ? next : 0
}

export function CardRail({ itemCount, variant, listClassName, ariaLabel, children, forceRail = false }: Props) {
  const railId = useId()
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [useRail, setUseRail] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const listClasses = useMemo(() => {
    const classes = [listClassName]
    if (useRail) {
      classes.push('tma-card-rail__list', `tma-card-rail__list--${variant}`)
    }
    return classes.join(' ')
  }, [listClassName, useRail, variant])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncRailMode = () => {
      if (forceRail) {
        setUseRail(itemCount > 1)
        return
      }
      const width = window.innerWidth
      setUseRail(shouldUseCardRail(itemCount, width))
    }

    syncRailMode()
    window.addEventListener('resize', syncRailMode)
    return () => window.removeEventListener('resize', syncRailMode)
  }, [forceRail, itemCount])

  useEffect(() => {
    const viewport = viewportRef.current
    const list = listRef.current

    if (!viewport || !list || !useRail) {
      setHasOverflow(false)
      setCanPrev(false)
      setCanNext(false)
      return
    }

    const update = () => {
      const max = viewport.scrollWidth - viewport.clientWidth
      const overflow = max > 1
      setHasOverflow(overflow)
      setCanPrev(overflow && viewport.scrollLeft > 1)
      setCanNext(overflow && viewport.scrollLeft < max - 1)
    }

    update()

    const onScroll = () => update()
    viewport.addEventListener('scroll', onScroll, { passive: true })

    const observer = new ResizeObserver(() => update())
    observer.observe(viewport)
    observer.observe(list)

    return () => {
      viewport.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [children, useRail])

  const scrollByCard = (direction: -1 | 1) => {
    const viewport = viewportRef.current
    const list = listRef.current
    const firstCard = list?.firstElementChild as HTMLElement | null
    if (!viewport || !list || !firstCard) return
    const gap = readGapPx(list)
    const width = firstCard.getBoundingClientRect().width + gap
    viewport.scrollBy({ left: width * direction, behavior: 'smooth' })
  }

  return (
    <div className={useRail ? 'tma-card-rail tma-card-rail--active' : 'tma-card-rail'}>
      {useRail && hasOverflow ? (
        <div className="tma-card-rail__controls">
          <button
            type="button"
            className="tma-card-rail__control"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-controls={railId}
            aria-label={`Scroll ${ariaLabel} left`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="tma-card-rail__control"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-controls={railId}
            aria-label={`Scroll ${ariaLabel} right`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
      <div
        ref={viewportRef}
        className={useRail ? 'tma-card-rail__viewport tma-card-rail__viewport--rail' : 'tma-card-rail__viewport'}
      >
        <ul ref={listRef} id={railId} className={listClasses} aria-label={ariaLabel}>
          {children}
        </ul>
      </div>
    </div>
  )
}
