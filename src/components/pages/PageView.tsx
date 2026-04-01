'use client'

import { useEffect, useState } from 'react'

import { PageLayout } from '@/components/blocks/PageLayout'
import { StickyCtaBar } from '@/components/blocks/StickyCtaBar'
import { HeroBackdrop } from '@/components/tma/HeroBackdrop'
import { CtaButton } from '@/components/tma/CtaButton'
import { PageTrackingPixels } from '@/components/tma/PageTrackingPixels'
import { sanitizePageCustomCss } from '@/lib/cms/resolveSectionPresentation'
import type { Page } from '@/types/cms'

type LayoutBlock = NonNullable<Page['layout']>[number]

function clampHeroInsertIndex(raw: number | null | undefined, mainCount: number): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  const k = Math.floor(raw)
  return Math.max(0, Math.min(k, mainCount))
}

export function PageView({
  page,
  embedShortcodeVars,
}: {
  page: Page
  embedShortcodeVars?: Record<string, string>
}) {
  const [liveLayout, setLiveLayout] = useState<LayoutBlock[] | null>(null)

  useEffect(() => {
    if (window.parent === window) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('builderPreview') !== '1') return

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const hit = target.closest('[data-tma-block-id]')
      if (!hit) return
      const blockId = hit.getAttribute('data-tma-block-id')
      if (!blockId) return
      window.parent.postMessage({ type: 'tma-preview-select-block', blockId }, '*')
    }

    const onMessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (!msg || typeof msg !== 'object' || !msg.type) return

      if (msg.type === 'tma-preview-live-layout' && Array.isArray(msg.layout)) {
        setLiveLayout(msg.layout as LayoutBlock[])
      }

      if (msg.type === 'tma-preview-refresh') {
        window.location.reload()
      }
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('message', onMessage)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('message', onMessage)
    }
  }, [])

  const layout = liveLayout ?? page.layout ?? []
  const mainBlocks = layout.filter((b) => b.blockType !== 'stickyCta')
  const stickyBlocks = layout.filter((b) => b.blockType === 'stickyCta')
  const lastSticky = stickyBlocks[stickyBlocks.length - 1]
  const hasStickyCta = Boolean(lastSticky)

  const hasExplicitHero = Boolean(page.hero?.headline?.trim())
  const k = hasExplicitHero
    ? clampHeroInsertIndex(page.heroInsertIndex ?? 0, mainBlocks.length)
    : 0
  const blocksBeforeHero = hasExplicitHero && k > 0 ? mainBlocks.slice(0, k) : []
  const blocksAfterHero = hasExplicitHero ? mainBlocks.slice(k) : mainBlocks

  const heroTitle = page.hero?.headline?.trim() ?? ''
  const lead = page.hero?.subheadline?.trim() || undefined
  const media =
    typeof page.hero?.backgroundMedia === 'object' && page.hero.backgroundMedia != null
      ? page.hero.backgroundMedia
      : undefined

  const primary =
    page.primaryCta?.label && page.primaryCta?.href ? (
      <CtaButton
        label={page.primaryCta.label}
        href={page.primaryCta.href}
        variant="secondary"
      />
    ) : null

  const hero = hasExplicitHero ? (
    <HeroBackdrop
      title={heroTitle}
      lead={lead}
      media={media}
      footerSlot={primary}
      headingId="tma-page-hero-heading"
    />
  ) : null

  const pageCss = sanitizePageCustomCss(page.customCss)
  const baseClass = hasStickyCta ? 'tma-page tma-page--sticky-cta' : 'tma-page'
  const themeClass =
    page.pageTheme === 'light'
      ? ' tma-page--theme-light'
      : page.pageTheme === 'dark'
        ? ' tma-page--theme-dark'
        : ''
  const widthClass =
    page.maxWidthMode === 'narrow'
      ? ' tma-page--max-narrow'
      : page.maxWidthMode === 'full'
        ? ' tma-page--max-full'
        : ''

  const tracking = page.trackingOverrides
  const hasPageTracking =
    tracking?.metaPixelId?.trim() ||
    tracking?.linkedInPartnerId?.trim() ||
    tracking?.gtmContainerId?.trim()

  return (
    <article className={`${baseClass}${themeClass}${widthClass}`.trim()}>
      {pageCss ? <style data-tma-page-css dangerouslySetInnerHTML={{ __html: pageCss }} /> : null}
      {hasPageTracking ? (
        <PageTrackingPixels
          metaPixelId={tracking?.metaPixelId}
          linkedInPartnerId={tracking?.linkedInPartnerId}
          pageGtmOverride={tracking?.gtmContainerId}
        />
      ) : null}
      {blocksBeforeHero.length > 0 ? (
        <PageLayout
          page={page}
          blocks={blocksBeforeHero}
          embedShortcodeVars={embedShortcodeVars}
        />
      ) : null}
      {hero}
      {blocksAfterHero.length > 0 ? (
        <PageLayout
          page={page}
          blocks={blocksAfterHero}
          embedShortcodeVars={embedShortcodeVars}
        />
      ) : null}
      {lastSticky ? (
        <StickyCtaBar
          label={lastSticky.label}
          href={lastSticky.href}
          variant={lastSticky.variant ?? 'primary'}
        />
      ) : null}
    </article>
  )
}
