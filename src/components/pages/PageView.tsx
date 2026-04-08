'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageLayout } from '@/components/blocks/PageLayout'
import { StickyCtaBar } from '@/components/blocks/StickyCtaBar'
import { PageTrackingPixels } from '@/components/tma/PageTrackingPixels'
import { sanitizePageCustomCss } from '@/lib/cms/resolveSectionPresentation'
import type { PublicLocale } from '@/lib/publicLocale'
import type { Page } from '@/types/cms'

type LayoutBlock = NonNullable<Page['layout']>[number]

export function PageView({
  page,
  embedShortcodeVars,
  locale = 'de',
  trackingConsentGranted = true,
}: {
  page: Page
  embedShortcodeVars?: Record<string, string>
  locale?: PublicLocale
  trackingConsentGranted?: boolean
}) {
  const [liveLayout, setLiveLayout] = useState<LayoutBlock[] | null>(null)
  const [selectedPreviewBlockId, setSelectedPreviewBlockId] = useState<string | null>(null)
  const [isBuilderPreview, setIsBuilderPreview] = useState(false)

  const handlePreviewBlockSelect = useCallback((blockId: string) => {
    if (!blockId.trim()) return
    setSelectedPreviewBlockId(blockId)
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'tma-preview-select-block', blockId }, '*')
    }
  }, [])

  useEffect(() => {
    if (window.parent === window) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('builderPreview') !== '1') return
    setIsBuilderPreview(true)

    const onMessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (!msg || typeof msg !== 'object' || !msg.type) return

      if (msg.type === 'tma-preview-live-layout' && Array.isArray(msg.layout)) {
        setLiveLayout(msg.layout as LayoutBlock[])
      }

      if (msg.type === 'tma-preview-highlight-block') {
        const blockId =
          typeof msg.blockId === 'string' && msg.blockId.trim() ? msg.blockId : null
        setSelectedPreviewBlockId(blockId)
      }

      if (msg.type === 'tma-preview-refresh') {
        window.location.reload()
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  const layout = useMemo(() => liveLayout ?? page.layout ?? [], [liveLayout, page.layout])
  const mainBlocks = layout.filter((b) => b.blockType !== 'stickyCta')
  const stickyBlocks = layout.filter((b) => b.blockType === 'stickyCta')
  const lastSticky = stickyBlocks[stickyBlocks.length - 1]
  const hasStickyCta = Boolean(lastSticky)

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

  useEffect(() => {
    if (!isBuilderPreview) return

    const blockNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tma-block-id]'))
    const cleanups = blockNodes.map((node) => {
      const onBlockClick = (event: MouseEvent) => {
        const blockId = node.getAttribute('data-tma-block-id')
        if (!blockId?.trim()) return
        event.preventDefault()
        event.stopPropagation()
        handlePreviewBlockSelect(blockId)
      }
      node.addEventListener('click', onBlockClick, true)
      return () => node.removeEventListener('click', onBlockClick, true)
    })

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [handlePreviewBlockSelect, isBuilderPreview, layout])

  return (
    <article
      className={`${baseClass}${themeClass}${widthClass}${isBuilderPreview ? ' tma-page--builder-preview' : ''}`.trim()}
    >
      {pageCss ? <style data-tma-page-css dangerouslySetInnerHTML={{ __html: pageCss }} /> : null}
      {hasPageTracking ? (
        <PageTrackingPixels
          metaPixelId={tracking?.metaPixelId}
          linkedInPartnerId={tracking?.linkedInPartnerId}
          pageGtmOverride={tracking?.gtmContainerId}
          enabled={trackingConsentGranted}
        />
      ) : null}
      {mainBlocks.length > 0 ? (
        <PageLayout
          page={page}
          blocks={mainBlocks}
          embedShortcodeVars={embedShortcodeVars}
          locale={locale}
          selectedBlockId={selectedPreviewBlockId}
          isBuilderPreview={isBuilderPreview}
          onSelectBlock={handlePreviewBlockSelect}
        />
      ) : null}
      {lastSticky ? (
        <StickyCtaBar
          label={lastSticky.label}
          href={lastSticky.href}
          variant={lastSticky.variant ?? 'primary'}
          locale={locale}
        />
      ) : null}
    </article>
  )
}
