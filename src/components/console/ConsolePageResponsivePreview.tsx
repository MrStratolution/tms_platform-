'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type DevicePreset = {
  id: string
  label: string
  width: number | null
  /** Hint for editors */
  hint: string
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'mobile', label: 'Mobile', width: 390, hint: 'iPhone-class width' },
  { id: 'mobileLg', label: 'Phone+', width: 430, hint: 'Large phone' },
  { id: 'tablet', label: 'Tablet', width: 768, hint: 'iPad portrait' },
  { id: 'tabletL', label: 'Tablet landscape', width: 1024, hint: 'Small laptop / iPad landscape' },
  { id: 'laptop', label: 'Laptop', width: 1280, hint: 'Common laptop' },
  { id: 'full', label: 'Fluid', width: null, hint: 'Uses full preview panel width' },
]

type Props = {
  visualPreviewUrl: string | null
  slug: string
  publicPath: string
  selectedBlockId?: string | null
  onSelectedBlockIdChange?: (id: string | null) => void
}

export function ConsolePageResponsivePreview({
  visualPreviewUrl,
  slug,
  publicPath,
  onSelectedBlockIdChange,
}: Props) {
  const [deviceId, setDeviceId] = useState<string>('tablet')
  const [iframeKey, setIframeKey] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const device = useMemo(
    () => DEVICE_PRESETS.find((d) => d.id === deviceId) ?? DEVICE_PRESETS[2],
    [deviceId],
  )

  const refresh = useCallback(() => {
    setIframeLoaded(false)
    setIframeKey((k) => k + 1)
  }, [])

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const data = ev.data as { type?: string; blockId?: string } | null
      if (!data || data.type !== 'tma-preview-select-block') return
      if (typeof data.blockId === 'string' && data.blockId.trim()) {
        onSelectedBlockIdChange?.(data.blockId)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onSelectedBlockIdChange])

  const previewUrlWithBuilderFlag = useMemo(() => {
    if (!visualPreviewUrl) return null
    try {
      const u = new URL(visualPreviewUrl)
      u.searchParams.set('builderPreview', '1')
      return u.toString()
    } catch {
      return visualPreviewUrl
    }
  }, [visualPreviewUrl])

  if (!visualPreviewUrl) {
    return (
      <section
        className="tma-console-preview-dock tma-console-preview-dock--empty"
        aria-label="Responsive preview"
      >
        <h2 className="tma-console-preview-dock__title">Responsive preview</h2>
        <p className="tma-console-note">
          Add a preview secret so draft pages can load in this frame. From the project root run{' '}
          <code>npm run ensure-preview-secret</code>, then <strong>restart</strong>{' '}
          <code>npm run dev</code>. Production: set <code>INTERNAL_PREVIEW_SECRET</code> in your
          host env (see <code>npm run gen:production-env</code>). Until then, use{' '}
          <strong>View public site</strong> for published pages only, or <strong>Visual preview</strong>{' '}
          in the toolbar once the secret exists.
        </p>
      </section>
    )
  }

  return (
    <section className="tma-console-preview-dock" aria-label="Responsive preview">
      <div className="tma-console-preview-dock__head">
        <div>
          <h2 className="tma-console-preview-dock__title">Responsive preview</h2>
          <p className="tma-console-preview-dock__meta">
            Draft / review content · <code>{publicPath}</code>
            <span className="tma-console-preview-dock__slug"> · slug {slug}</span>
          </p>
        </div>
        <div className="tma-console-preview-dock__actions">
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={() => refresh()}
            aria-label="Reload preview"
          >
            Refresh
          </button>
          <a
            href={previewUrlWithBuilderFlag ?? visualPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="tma-console-btn-secondary"
          >
            Open tab
          </a>
        </div>
      </div>

      <p className="tma-console-hint tma-console-preview-dock__hint">
        Save your changes, then <strong>Refresh</strong>. This iframe uses the same preview URL as
        <strong> Visual preview</strong> in the toolbar. Scroll inside the frame to check long
        pages on small widths.
      </p>

      <div className="tma-console-preview-dock__devices" role="toolbar" aria-label="Viewport width">
        {DEVICE_PRESETS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`tma-console-device-chip${d.id === deviceId ? ' tma-console-device-chip--active' : ''}`}
            onClick={() => setDeviceId(d.id)}
            title={d.hint}
          >
            {d.label}
            {d.width ? (
              <span className="tma-console-device-chip__px">{d.width}px</span>
            ) : (
              <span className="tma-console-device-chip__px">100%</span>
            )}
          </button>
        ))}
      </div>
      <p className="tma-console-hint" style={{ marginTop: 0 }}>
        {device.hint}
        {device.width && device.width >= 1024 ? (
          <>
            {' '}
            — if the frame is narrower, use horizontal scroll in the chrome below.
          </>
        ) : null}
      </p>

      <div className="tma-console-preview-dock__chrome">
        <div className="tma-console-preview-dock__chrome-label" aria-hidden>
          <span className="tma-console-preview-dock__dot" />
          <span className="tma-console-preview-dock__dot" />
          <span className="tma-console-preview-dock__dot" />
          <span className="tma-console-preview-dock__url">Preview</span>
        </div>
        <div className="tma-console-preview-dock__viewport-wrap">
          <div
            className="tma-console-preview-dock__viewport"
            style={
              device.width != null
                ? { width: device.width, maxWidth: '100%' }
                : { width: '100%', maxWidth: '100%' }
            }
          >
            <div
              className="tma-console-preview-dock__loading"
              role="status"
              aria-live="polite"
              hidden={iframeLoaded}
            >
              Loading preview…
            </div>
            <iframe
              key={iframeKey}
              title={`Page preview at ${device.label}`}
              src={previewUrlWithBuilderFlag ?? visualPreviewUrl}
              className={`tma-console-preview-dock__iframe${iframeLoaded ? '' : ' tma-console-preview-dock__iframe--pending'}`}
              onLoad={() => setIframeLoaded(true)}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
