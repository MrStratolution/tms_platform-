'use client'

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import {
  DownloadAssetPicker,
  FaqLibraryPicker,
  TestimonialSliderPicker,
} from '@/components/console/ConsoleLibraryPickers'
import { ConsoleInlineMediaField } from '@/components/console/ConsoleInlineMediaField'
import {
  cloneLayoutBlockJson,
  LAYOUT_BLOCK_ADD_OPTIONS,
  createDefaultLayoutBlock,
  type LayoutBlockType,
} from '@/lib/cms/layoutBlockPresets'
import { readResponseJson } from '@/lib/safeJson'

import { SortableLayoutBlockRow } from './SortableLayoutBlockRow'

const BLOCK_LABEL_MAP = new Map(LAYOUT_BLOCK_ADD_OPTIONS.map(o => [o.value, o.label]))

const compactInputClass = 'tma-console-input tma-console-input--compact'

function formConfigIdFromBlock(o: Record<string, unknown>): number | '' {
  if (typeof o.formConfig === 'number' && Number.isFinite(o.formConfig)) return o.formConfig
  const fc = o.formConfig
  if (fc && typeof fc === 'object' && !Array.isArray(fc) && typeof (fc as { id?: unknown }).id === 'number') {
    return (fc as { id: number }).id
  }
  return ''
}

function bookingProfileIdFromBlock(o: Record<string, unknown>): number | '' {
  if (typeof o.bookingProfile === 'number' && Number.isFinite(o.bookingProfile)) return o.bookingProfile
  const bp = o.bookingProfile
  if (bp && typeof bp === 'object' && !Array.isArray(bp) && typeof (bp as { id?: unknown }).id === 'number') {
    return (bp as { id: number }).id
  }
  return ''
}

function FormBlockQuickPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const [rows, setRows] = useState<{ id: number; formType: string; active: boolean }[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/form-configs', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          formConfigs?: { id: number; formType: string; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load forms')
          return
        }
        setRows(data?.formConfigs ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const currentId = formConfigIdFromBlock(o)
  const width =
    o.width === 'narrow' || o.width === 'wide' || o.width === 'full'
      ? String(o.width)
      : 'default'

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Pick a saved form. Field definitions live under <strong>Forms</strong> in the console. The public
        page loads this config by id.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <label className="tma-console-label">
        Form
        <select
          className={compactInputClass}
          value={currentId === '' ? '' : String(currentId)}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') return
            set({ formConfig: Number.parseInt(v, 10) })
          }}
          disabled={disabled || rows.length === 0}
        >
          {rows.length === 0 ? (
            <option value="">No form configs</option>
          ) : (
            <>
              <option value="" disabled>Select a form…</option>
              {rows.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.formType}
                  {!r.active ? ' (inactive)' : ''} — id {r.id}
                </option>
              ))}
            </>
          )}
        </select>
      </label>
      <label className="tma-console-label">
        Form width
        <select
          className={compactInputClass}
          value={width}
          onChange={(e) =>
            set({
              width:
                e.target.value === 'default'
                  ? 'default'
                  : (e.target.value as 'narrow' | 'wide' | 'full'),
            })
          }
          disabled={disabled}
        >
          <option value="narrow">Narrow</option>
          <option value="default">Default</option>
          <option value="wide">Wide</option>
          <option value="full">Full width</option>
        </select>
      </label>
    </div>
  )
}

function BookingBlockQuickPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const [rows, setRows] = useState<
    { id: number; internalSlug: string | null; active: boolean }[]
  >([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/booking-profiles', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          bookingProfiles?: { id: number; internalSlug: string | null; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load booking profiles')
          return
        }
        setRows(data?.bookingProfiles ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const currentId = bookingProfileIdFromBlock(o)
  const width =
    o.width === 'narrow' || o.width === 'wide' || o.width === 'full'
      ? String(o.width)
      : 'default'

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Pick a booking profile (scheduler or external link). Manage profiles under <strong>Booking</strong>.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <label className="tma-console-label">
        Booking profile
        <select
          className={compactInputClass}
          value={currentId === '' ? '' : String(currentId)}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') return
            set({ bookingProfile: Number.parseInt(v, 10) })
          }}
          disabled={disabled || rows.length === 0}
        >
          {rows.length === 0 ? (
            <option value="">No profiles</option>
          ) : (
            rows.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {(r.internalSlug && r.internalSlug.trim()) || `Profile ${r.id}`}
                {!r.active ? ' (inactive)' : ''} — id {r.id}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="tma-console-label">
        Card width
        <select
          className={compactInputClass}
          value={width}
          onChange={(e) =>
            set({
              width:
                e.target.value === 'default'
                  ? 'default'
                  : (e.target.value as 'narrow' | 'wide' | 'full'),
            })
          }
          disabled={disabled}
        >
          <option value="narrow">Narrow</option>
          <option value="default">Default</option>
          <option value="wide">Wide</option>
          <option value="full">Full width</option>
        </select>
      </label>
    </div>
  )
}

export function parseLayout(docText: string): { ok: true; layout: unknown[] } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(docText)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Document must be a JSON object.' }
    }
    const layout = (parsed as Record<string, unknown>).layout
    if (layout === undefined) return { ok: true, layout: [] }
    if (!Array.isArray(layout)) return { ok: false, error: '`layout` must be an array.' }
    return { ok: true, layout: [...layout] }
  } catch {
    return { ok: false, error: 'Document is not valid JSON.' }
  }
}

export function mergeLayoutIntoDocText(docText: string, layout: unknown[]): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(docText)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Document must be a JSON object.' }
    }
    const o = { ...(parsed as Record<string, unknown>), layout }
    return { ok: true, text: JSON.stringify(o, null, 2) }
  } catch {
    return { ok: false, error: 'Document is not valid JSON.' }
  }
}

export function blockLabel(block: unknown, index: number): string {
  if (block && typeof block === 'object' && !Array.isArray(block)) {
    const o = block as Record<string, unknown>
    const bt = o.blockType
    if (bt === 'layoutBlockRef') {
      const lid = o.layoutBlockId
      return `${index + 1}. Saved block (linked #${typeof lid === 'number' ? lid : '?'})`
    }
    if (typeof bt === 'string') {
      const label = BLOCK_LABEL_MAP.get(bt as LayoutBlockType) ?? bt
      return `${index + 1}. ${label}`
    }
  }
  return `${index + 1}. (invalid block)`
}

function newBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function blockHasId(block: unknown): boolean {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return false
  const id = (block as Record<string, unknown>).id
  return typeof id === 'string' && id.length > 0
}

function ensureBlockIds(layout: unknown[]): unknown[] {
  return layout.map((b) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return b
    const o = b as Record<string, unknown>
    if (typeof o.id === 'string' && o.id.length > 0) return b
    return { ...o, id: newBlockId() }
  })
}

function sortableIdForBlock(block: unknown, index: number): string {
  if (blockHasId(block)) {
    return String((block as Record<string, unknown>).id)
  }
  return `__pending-${index}`
}

const emptyLayoutRef: unknown[] = []

export function patchBlockAt(
  layout: unknown[],
  index: number,
  patch: Record<string, unknown>,
): unknown[] {
  return layout.map((b, i) => {
    if (i !== index) return b
    if (!b || typeof b !== 'object' || Array.isArray(b)) return b
    return { ...(b as Record<string, unknown>), ...patch }
  })
}

export function SectionChromeQuickFields(props: {
  block: unknown
  index: number
  layout: unknown[]
  applyLayout: (next: unknown[]) => void
  disabled: boolean
}) {
  const { block, index, layout, applyLayout, disabled } = props
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  const o = block as Record<string, unknown>
  const set = (patch: Record<string, unknown>) => {
    applyLayout(patchBlockAt(layout, index, patch))
  }
  const fieldClass = compactInputClass

  const spacingVal =
    o.sectionSpacingY === 'none' ||
    o.sectionSpacingY === 'sm' ||
    o.sectionSpacingY === 'md' ||
    o.sectionSpacingY === 'lg'
      ? String(o.sectionSpacingY)
      : 'inherit'

  const widthVal =
    o.widthMode === 'default' || o.widthMode === 'narrow' || o.widthMode === 'full'
      ? String(o.widthMode)
      : 'inherit'

  return (
    <div className="tma-console-section-chrome" style={{ marginBottom: '0.75rem' }}>
      <p className="tma-console-block-fields-hint" style={{ marginTop: 0 }}>
        <strong>Section shell</strong> — anchor, spacing, width, and visibility on the public site. Leave
        at <strong>Inherit</strong> to use page and site defaults.
      </p>
      <label className="tma-console-label">
        Anchor id (for #links)
        <input
          className={fieldClass}
          value={typeof o.anchorId === 'string' ? o.anchorId : ''}
          onChange={(e) => set({ anchorId: e.target.value.trim() ? e.target.value.trim() : undefined })}
          disabled={disabled}
          placeholder="e.g. pricing"
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        Vertical spacing
        <select
          className={fieldClass}
          value={spacingVal}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'inherit') set({ sectionSpacingY: undefined })
            else set({ sectionSpacingY: v as 'none' | 'sm' | 'md' | 'lg' })
          }}
          disabled={disabled}
        >
          <option value="inherit">Inherit</option>
          <option value="none">None</option>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <label className="tma-console-label">
        Section width
        <select
          className={fieldClass}
          value={widthVal}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'inherit') set({ widthMode: undefined })
            else set({ widthMode: v as 'default' | 'narrow' | 'full' })
          }}
          disabled={disabled}
        >
          <option value="inherit">Inherit</option>
          <option value="default">Default</option>
          <option value="narrow">Narrow</option>
          <option value="full">Full width</option>
        </select>
      </label>
      <label className="tma-console-label">
        Extra CSS classes
        <input
          className={fieldClass}
          value={typeof o.customClass === 'string' ? o.customClass : ''}
          onChange={(e) => set({ customClass: e.target.value.trim() ? e.target.value.trim() : undefined })}
          disabled={disabled}
          placeholder="Optional utility classes"
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={Boolean(o.sectionHidden)}
          onChange={(e) => set({ sectionHidden: e.target.checked ? true : undefined })}
          disabled={disabled}
        />
        Hide this section on the public site
      </label>
      <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={Boolean(o.hideOnDesktop)}
          onChange={(e) => set({ hideOnDesktop: e.target.checked ? true : undefined })}
          disabled={disabled}
        />
        Hide on desktop (&ge; 769px)
      </label>
      <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={Boolean(o.hideOnMobile)}
          onChange={(e) => set({ hideOnMobile: e.target.checked ? true : undefined })}
          disabled={disabled}
        />
        Hide on mobile (&le; 768px)
      </label>
    </div>
  )
}

function asRecordArray(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[]
}

export function LayoutBlockQuickFields(props: {
  block: unknown
  index: number
  layout: unknown[]
  applyLayout: (next: unknown[]) => void
  disabled: boolean
}) {
  const { block, index, layout, applyLayout, disabled } = props
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  const o = block as Record<string, unknown>
  const bt = o.blockType
  const set = (patch: Record<string, unknown>) => {
    applyLayout(patchBlockAt(layout, index, patch))
  }

  const fieldClass = 'tma-console-input tma-console-input--compact'

  switch (bt) {
    case 'hero': {
      const heroHeight =
        o.height === 'short' || o.height === 'tall' || o.height === 'medium'
          ? String(o.height)
          : 'medium'
      const heroFit = o.mediaFit === 'contain' ? 'contain' : 'cover'
      const heroPosX =
        o.mediaPositionX === 'left' || o.mediaPositionX === 'right' ? String(o.mediaPositionX) : 'center'
      const heroPosY =
        o.mediaPositionY === 'top' || o.mediaPositionY === 'bottom' ? String(o.mediaPositionY) : 'center'
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Headline
            <input className={fieldClass} value={String(o.headline ?? '')} onChange={(e) => set({ headline: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            Subheadline (optional)
            <textarea className={fieldClass} rows={2} value={String(o.subheadline ?? '')} onChange={(e) => set({ subheadline: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            CTA label (optional)
            <input className={fieldClass} value={String(o.ctaLabel ?? '')} onChange={(e) => set({ ctaLabel: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            CTA URL (optional)
            <input className={fieldClass} value={String(o.ctaHref ?? '')} onChange={(e) => set({ ctaHref: e.target.value })} disabled={disabled} />
          </label>
          <ConsoleInlineMediaField
            label="Hero background image"
            value={typeof o.backgroundMediaUrl === 'string' ? o.backgroundMediaUrl : undefined}
            onChange={(next) => set({ backgroundMediaUrl: next ?? '' })}
            disabled={disabled}
            helpText="Upload or choose the main hero background."
            folderSuggestion="hero"
          />
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Hero height
              <select
                className={fieldClass}
                value={heroHeight}
                onChange={(e) => set({ height: e.target.value as 'short' | 'medium' | 'tall' })}
                disabled={disabled}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="tall">Tall</option>
              </select>
            </label>
            <label className="tma-console-label">
              Image fit
              <select
                className={fieldClass}
                value={heroFit}
                onChange={(e) => set({ mediaFit: e.target.value as 'cover' | 'contain' })}
                disabled={disabled}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Focal point X
              <select
                className={fieldClass}
                value={heroPosX}
                onChange={(e) => set({ mediaPositionX: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="tma-console-label">
              Focal point Y
              <select
                className={fieldClass}
                value={heroPosY}
                onChange={(e) => set({ mediaPositionY: e.target.value as 'top' | 'center' | 'bottom' })}
                disabled={disabled}
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>
          <ConsoleInlineMediaField
            label="Tablet image (optional override)"
            value={typeof o.tabletImageUrl === 'string' ? o.tabletImageUrl : undefined}
            onChange={(next) => set({ tabletImageUrl: next })}
            disabled={disabled}
            folderSuggestion="hero"
          />
          <ConsoleInlineMediaField
            label="Mobile image (optional override)"
            value={typeof o.mobileImageUrl === 'string' ? o.mobileImageUrl : undefined}
            onChange={(next) => set({ mobileImageUrl: next })}
            disabled={disabled}
            folderSuggestion="hero"
          />
        </div>
      )
    }
    case 'cta':
    case 'stickyCta':
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Button label
            <input
              className={fieldClass}
              value={String(o.label ?? '')}
              onChange={(e) => set({ label: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            URL
            <input
              className={fieldClass}
              value={String(o.href ?? '')}
              onChange={(e) => set({ href: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Style
            <select
              className={fieldClass}
              value={
                o.variant === 'secondary' || o.variant === 'ghost' ? String(o.variant) : 'primary'
              }
              onChange={(e) =>
                set({
                  variant: e.target.value as 'primary' | 'secondary' | 'ghost',
                })
              }
              disabled={disabled}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="ghost">Ghost</option>
            </select>
          </label>
        </div>
      )
    case 'textMedia': {
      const imagePos =
        o.imagePosition === 'left' ||
        o.imagePosition === 'top' ||
        o.imagePosition === 'bottom'
          ? String(o.imagePosition)
          : 'right'
      const mediaWidth =
        o.mediaWidth === 'narrow' || o.mediaWidth === 'wide' || o.mediaWidth === 'full'
          ? String(o.mediaWidth)
          : 'default'
      const aspectRatio =
        o.aspectRatio === 'square' ||
        o.aspectRatio === 'portrait' ||
        o.aspectRatio === 'landscape' ||
        o.aspectRatio === 'cinema'
          ? String(o.aspectRatio)
          : 'auto'
      const fit = o.mediaFit === 'contain' ? 'contain' : 'cover'
      const align = o.mediaAlign === 'left' || o.mediaAlign === 'right' ? String(o.mediaAlign) : 'center'
      const radius =
        o.borderRadius === 'none' ||
        o.borderRadius === 'sm' ||
        o.borderRadius === 'lg' ||
        o.borderRadius === 'pill'
          ? String(o.borderRadius)
          : 'md'
      const posX =
        o.mediaPositionX === 'left' || o.mediaPositionX === 'right' ? String(o.mediaPositionX) : 'center'
      const posY =
        o.mediaPositionY === 'top' || o.mediaPositionY === 'bottom' ? String(o.mediaPositionY) : 'center'
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Layout
            <select
              className={fieldClass}
              value={imagePos}
              onChange={(e) =>
                set({
                  imagePosition: e.target.value as 'left' | 'right' | 'top' | 'bottom',
                })
              }
              disabled={disabled}
            >
              <option value="right">Image on the right (text first)</option>
              <option value="left">Image on the left</option>
              <option value="top">Stacked — image above text</option>
              <option value="bottom">Stacked — image below text</option>
            </select>
          </label>
          <p className="tma-console-block-fields-hint">
            On wide screens, left/right use two columns; stacked uses one column. On small screens, order
            matches your choice.
          </p>
          <label className="tma-console-label">
            Headline
            <input
              className={fieldClass}
              value={String(o.headline ?? '')}
              onChange={(e) => set({ headline: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Body
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.body ?? '')}
              onChange={(e) => set({ body: e.target.value })}
              disabled={disabled}
            />
          </label>
          <ConsoleInlineMediaField
            label="Image"
            value={typeof o.imageUrl === 'string' ? o.imageUrl : undefined}
            onChange={(next) => set({ imageUrl: next ?? '' })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            helpText="Upload or pick an image from Media. The page keeps storing the URL/path behind the scenes."
            folderSuggestion="page-builder"
          />
          <label className="tma-console-label">
            Image alt
            <input
              className={fieldClass}
              value={String(o.imageAlt ?? '')}
              onChange={(e) => set({ imageAlt: e.target.value })}
              disabled={disabled}
            />
          </label>
          <ConsoleInlineMediaField
            label="Tablet image (optional override)"
            value={typeof o.tabletImageUrl === 'string' ? o.tabletImageUrl : undefined}
            onChange={(next) => set({ tabletImageUrl: next })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            folderSuggestion="page-builder"
          />
          <ConsoleInlineMediaField
            label="Mobile image (optional override)"
            value={typeof o.mobileImageUrl === 'string' ? o.mobileImageUrl : undefined}
            onChange={(next) => set({ mobileImageUrl: next })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            folderSuggestion="page-builder"
          />
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Media width
              <select
                className={fieldClass}
                value={mediaWidth}
                onChange={(e) => set({ mediaWidth: e.target.value as 'narrow' | 'default' | 'wide' | 'full' })}
                disabled={disabled}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
                <option value="full">Full width</option>
              </select>
            </label>
            <label className="tma-console-label">
              Aspect ratio
              <select
                className={fieldClass}
                value={aspectRatio}
                onChange={(e) => set({ aspectRatio: e.target.value as 'auto' | 'square' | 'portrait' | 'landscape' | 'cinema' })}
                disabled={disabled}
              >
                <option value="auto">Auto</option>
                <option value="square">Square</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="cinema">Cinema</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Fit
              <select
                className={fieldClass}
                value={fit}
                onChange={(e) => set({ mediaFit: e.target.value as 'cover' | 'contain' })}
                disabled={disabled}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            <label className="tma-console-label">
              Alignment
              <select
                className={fieldClass}
                value={align}
                onChange={(e) => set({ mediaAlign: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Focal point X
              <select
                className={fieldClass}
                value={posX}
                onChange={(e) => set({ mediaPositionX: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="tma-console-label">
              Focal point Y
              <select
                className={fieldClass}
                value={posY}
                onChange={(e) => set({ mediaPositionY: e.target.value as 'top' | 'center' | 'bottom' })}
                disabled={disabled}
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Border radius
              <select
                className={fieldClass}
                value={radius}
                onChange={(e) => set({ borderRadius: e.target.value as 'none' | 'sm' | 'md' | 'lg' | 'pill' })}
                disabled={disabled}
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="pill">Pill / full</option>
              </select>
            </label>
            <label className="tma-console-label">
              Max width (advanced)
              <input
                className={fieldClass}
                value={String(o.maxMediaWidth ?? '')}
                onChange={(e) => set({ maxMediaWidth: e.target.value })}
                disabled={disabled}
                placeholder="e.g. 36rem"
              />
            </label>
          </div>
          <label className="tma-console-label">
            Max height (advanced)
            <input
              className={fieldClass}
              value={String(o.maxMediaHeight ?? '')}
              onChange={(e) => set({ maxMediaHeight: e.target.value })}
              disabled={disabled}
              placeholder="e.g. 28rem"
            />
          </label>
        </div>
      )
    }
    case 'video': {
      const videoWidth =
        o.width === 'narrow' || o.width === 'wide' || o.width === 'full'
          ? String(o.width)
          : 'default'
      const sourceType = o.sourceType === 'upload' ? 'upload' : 'embed'
      const videoHeight =
        o.height === 'short' || o.height === 'medium' || o.height === 'tall'
          ? String(o.height)
          : 'auto'
      const aspectRatio =
        o.aspectRatio === 'square' ||
        o.aspectRatio === 'portrait' ||
        o.aspectRatio === 'landscape' ||
        o.aspectRatio === 'cinema'
          ? String(o.aspectRatio)
          : 'auto'
      const align = o.mediaAlign === 'left' || o.mediaAlign === 'right' ? String(o.mediaAlign) : 'center'
      const radius =
        o.borderRadius === 'none' ||
        o.borderRadius === 'sm' ||
        o.borderRadius === 'lg' ||
        o.borderRadius === 'pill'
          ? String(o.borderRadius)
          : 'md'
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Video source
            <select
              className={fieldClass}
              value={sourceType}
              onChange={(e) => set({ sourceType: e.target.value as 'embed' | 'upload' })}
              disabled={disabled}
            >
              <option value="embed">External embed URL</option>
              <option value="upload">Uploaded video</option>
            </select>
          </label>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Width
              <select
                className={fieldClass}
                value={videoWidth}
                onChange={(e) => set({ width: e.target.value as 'narrow' | 'default' | 'wide' | 'full' })}
                disabled={disabled}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
                <option value="full">Full width</option>
              </select>
            </label>
            <label className="tma-console-label">
              Height
              <select
                className={fieldClass}
                value={videoHeight}
                onChange={(e) => set({ height: e.target.value as 'auto' | 'short' | 'medium' | 'tall' })}
                disabled={disabled}
              >
                <option value="auto">Auto</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="tall">Tall</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Aspect ratio
              <select
                className={fieldClass}
                value={aspectRatio}
                onChange={(e) => set({ aspectRatio: e.target.value as 'auto' | 'square' | 'portrait' | 'landscape' | 'cinema' })}
                disabled={disabled}
              >
                <option value="auto">Auto</option>
                <option value="square">Square</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="cinema">Cinema</option>
              </select>
            </label>
            <label className="tma-console-label">
              Alignment
              <select
                className={fieldClass}
                value={align}
                onChange={(e) => set({ mediaAlign: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Border radius
              <select
                className={fieldClass}
                value={radius}
                onChange={(e) => set({ borderRadius: e.target.value as 'none' | 'sm' | 'md' | 'lg' | 'pill' })}
                disabled={disabled}
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="pill">Pill / full</option>
              </select>
            </label>
            <label className="tma-console-label">
              Max width (advanced)
              <input
                className={fieldClass}
                value={String(o.maxMediaWidth ?? '')}
                onChange={(e) => set({ maxMediaWidth: e.target.value })}
                disabled={disabled}
                placeholder="e.g. 52rem"
              />
            </label>
          </div>
          <label className="tma-console-label">
            Max height (advanced)
            <input
              className={fieldClass}
              value={String(o.maxMediaHeight ?? '')}
              onChange={(e) => set({ maxMediaHeight: e.target.value })}
              disabled={disabled}
              placeholder="e.g. 32rem"
            />
          </label>
          <label className="tma-console-label">
            Title (optional)
            <input
              className={fieldClass}
              value={String(o.title ?? '')}
              onChange={(e) => set({ title: e.target.value })}
              disabled={disabled}
            />
          </label>
          {sourceType === 'embed' ? (
            <label className="tma-console-label">
              Video URL (YouTube or Vimeo)
              <input
                className={fieldClass}
                value={String(o.url ?? '')}
                onChange={(e) => set({ url: e.target.value })}
                disabled={disabled}
              />
            </label>
          ) : (
            <ConsoleInlineMediaField
              label="Uploaded video"
              value={
                typeof o.uploadedVideoUrl === 'string'
                  ? o.uploadedVideoUrl
                  : typeof o.url === 'string'
                    ? o.url
                    : undefined
              }
              onChange={(next) => set({ uploadedVideoUrl: next ?? '', url: next ?? '' })}
              disabled={disabled}
              folderSuggestion="video"
              mediaKind="video"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              uploadLabel="Upload video"
              chooseLabel="Choose video"
              helpText="Upload a native video file or pick one from Media."
            />
          )}
          <ConsoleInlineMediaField
            label="Poster image (optional)"
            value={typeof o.posterUrl === 'string' ? o.posterUrl : undefined}
            onChange={(next) => set({ posterUrl: next ?? '' })}
            disabled={disabled}
            folderSuggestion="video"
          />
        </div>
      )
    }
    case 'download':
      return (
        <div className="tma-console-block-fields">
          <DownloadAssetPicker o={o} set={set} disabled={disabled} />
          <label className="tma-console-label">
            Title
            <input
              className={fieldClass}
              value={String(o.title ?? '')}
              onChange={(e) => set({ title: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            File URL
            <input
              className={fieldClass}
              value={String(o.fileUrl ?? '')}
              onChange={(e) => set({ fileUrl: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Link label
            <input
              className={fieldClass}
              value={String(o.fileLabel ?? '')}
              onChange={(e) => set({ fileLabel: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Description
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.description ?? '')}
              onChange={(e) => set({ description: e.target.value })}
              disabled={disabled}
            />
          </label>
        </div>
      )
    case 'faq': {
      const rows = asRecordArray(o.items)
      const updateRow = (idx: number, patch: Record<string, unknown>) => {
        const next = rows.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (typeof merged.id !== 'string' || !merged.id) merged.id = newBlockId()
          return merged
        })
        set({ items: next })
      }
      const addRow = () => {
        set({
          items: [
            ...rows,
            { id: newBlockId(), question: 'New question', answer: 'New answer' },
          ],
        })
      }
      const removeRow = (idx: number) => {
        set({ items: rows.filter((_, j) => j !== idx) })
      }
      return (
        <div className="tma-console-block-fields">
          <FaqLibraryPicker o={o} set={set} disabled={disabled} />
          <p className="tma-console-block-fields-hint">
            Inline Q&amp;A below is used only when no library ids are set above.
          </p>
          {rows.length === 0 ? (
            <p className="tma-console-lead">No questions yet.</p>
          ) : (
            rows.map((row, idx) => (
              <div
                key={typeof row.id === 'string' ? row.id : `faq-${idx}`}
                className="tma-console-nested-block"
              >
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Item {idx + 1}</span>
                  <button
                    type="button"
                    className="tma-console-btn-danger tma-console-btn-danger--small"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
                <label className="tma-console-label">
                  Question
                  <input
                    className={fieldClass}
                    value={String(row.question ?? '')}
                    onChange={(e) => updateRow(idx, { question: e.target.value })}
                    disabled={disabled}
                  />
                </label>
                <label className="tma-console-label">
                  Answer
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={String(row.answer ?? '')}
                    onChange={(e) => updateRow(idx, { answer: e.target.value })}
                    disabled={disabled}
                  />
                </label>
              </div>
            ))
          )}
          <button type="button" className="tma-console-btn-secondary" onClick={addRow} disabled={disabled}>
            Add FAQ item
          </button>
        </div>
      )
    }
    case 'stats': {
      const rows = asRecordArray(o.items)
      const updateRow = (idx: number, patch: Record<string, unknown>) => {
        const next = rows.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (typeof merged.id !== 'string' || !merged.id) merged.id = newBlockId()
          return merged
        })
        set({ items: next })
      }
      const addRow = () => {
        set({
          items: [
            ...rows,
            { id: newBlockId(), value: '0', label: 'New metric', suffix: '' },
          ],
        })
      }
      const removeRow = (idx: number) => {
        set({ items: rows.filter((_, j) => j !== idx) })
      }
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Layout
            <select
              className={fieldClass}
              value={o.variant === 'compact' ? 'compact' : 'default'}
              onChange={(e) => set({ variant: e.target.value })}
              disabled={disabled}
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          {rows.map((row, idx) => (
            <div
              key={typeof row.id === 'string' ? row.id : `stat-${idx}`}
              className="tma-console-nested-block"
            >
              <div className="tma-console-nested-block__head">
                <span className="tma-console-nested-block__title">Metric {idx + 1}</span>
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  onClick={() => removeRow(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
              <div className="tma-console-field-row">
                <label className="tma-console-label">
                  Value
                  <input
                    className={fieldClass}
                    value={String(row.value ?? '')}
                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                    disabled={disabled}
                  />
                </label>
                <label className="tma-console-label">
                  Suffix (optional)
                  <input
                    className={fieldClass}
                    value={String(row.suffix ?? '')}
                    onChange={(e) => updateRow(idx, { suffix: e.target.value })}
                    disabled={disabled}
                    placeholder="x, %, …"
                  />
                </label>
              </div>
              <label className="tma-console-label">
                Label
                <input
                  className={fieldClass}
                  value={String(row.label ?? '')}
                  onChange={(e) => updateRow(idx, { label: e.target.value })}
                  disabled={disabled}
                />
              </label>
            </div>
          ))}
          <button type="button" className="tma-console-btn-secondary" onClick={addRow} disabled={disabled}>
            Add metric
          </button>
        </div>
      )
    }
    case 'process': {
      const steps = asRecordArray(o.steps)
      const updateStep = (idx: number, patch: Record<string, unknown>) => {
        const next = steps.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (typeof merged.id !== 'string' || !merged.id) merged.id = newBlockId()
          return merged
        })
        set({ steps: next })
      }
      const addStep = () => {
        set({
          steps: [
            ...steps,
            {
              id: newBlockId(),
              badge: String(steps.length + 1).padStart(2, '0'),
              title: 'New step',
              body: 'Describe this step.',
            },
          ],
        })
      }
      const removeStep = (idx: number) => {
        set({ steps: steps.filter((_, j) => j !== idx) })
      }
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Layout
            <select
              className={fieldClass}
              value={o.variant === 'compact' ? 'compact' : 'default'}
              onChange={(e) => set({ variant: e.target.value })}
              disabled={disabled}
            >
              <option value="default">Default spacing</option>
              <option value="compact">Compact timeline</option>
            </select>
          </label>
          <label className="tma-console-label">
            Section title
            <input
              className={fieldClass}
              value={String(o.sectionTitle ?? '')}
              onChange={(e) => set({ sectionTitle: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Intro
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.intro ?? '')}
              onChange={(e) => set({ intro: e.target.value })}
              disabled={disabled}
            />
          </label>
          {steps.map((step, idx) => (
            <div
              key={typeof step.id === 'string' ? step.id : `step-${idx}`}
              className="tma-console-nested-block"
            >
              <div className="tma-console-nested-block__head">
                <span className="tma-console-nested-block__title">Step {idx + 1}</span>
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  onClick={() => removeStep(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
              <label className="tma-console-label">
                Badge (e.g. 01)
                <input
                  className={fieldClass}
                  value={String(step.badge ?? '')}
                  onChange={(e) => updateStep(idx, { badge: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="tma-console-label">
                Title
                <input
                  className={fieldClass}
                  value={String(step.title ?? '')}
                  onChange={(e) => updateStep(idx, { title: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="tma-console-label">
                Body
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={String(step.body ?? '')}
                  onChange={(e) => updateStep(idx, { body: e.target.value })}
                  disabled={disabled}
                />
              </label>
            </div>
          ))}
          <button type="button" className="tma-console-btn-secondary" onClick={addStep} disabled={disabled}>
            Add step
          </button>
        </div>
      )
    }
    case 'promoBanner':
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Eyebrow (optional)
            <input
              className={fieldClass}
              value={String(o.eyebrow ?? '')}
              onChange={(e) => set({ eyebrow: e.target.value })}
              disabled={disabled}
              placeholder="e.g. New · Limited spots"
            />
          </label>
          <label className="tma-console-label">
            Headline
            <input
              className={fieldClass}
              value={String(o.headline ?? '')}
              onChange={(e) => set({ headline: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Body (optional)
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.body ?? '')}
              onChange={(e) => set({ body: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            CTA label (optional)
            <input
              className={fieldClass}
              value={String(o.ctaLabel ?? '')}
              onChange={(e) => set({ ctaLabel: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            CTA URL (optional)
            <input
              className={fieldClass}
              value={String(o.ctaHref ?? '')}
              onChange={(e) => set({ ctaHref: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Look
            <select
              className={fieldClass}
              value={
                o.variant === 'dark' ||
                o.variant === 'outline' ||
                o.variant === 'gradient' ||
                o.variant === 'lime'
                  ? String(o.variant)
                  : 'lime'
              }
              onChange={(e) =>
                set({
                  variant: e.target.value as 'lime' | 'dark' | 'outline' | 'gradient',
                })
              }
              disabled={disabled}
            >
              <option value="lime">Lime glow (default)</option>
              <option value="gradient">Deep gradient (premium)</option>
              <option value="dark">Muted glass</option>
              <option value="outline">Outline / minimal</option>
            </select>
          </label>
          <label className="tma-console-label">
            Alignment
            <select
              className={fieldClass}
              value={o.align === 'center' ? 'center' : 'left'}
              onChange={(e) => set({ align: e.target.value as 'left' | 'center' })}
              disabled={disabled}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </label>
        </div>
      )
    case 'imageBanner': {
      const mediaWidth =
        o.mediaWidth === 'narrow' || o.mediaWidth === 'wide' || o.mediaWidth === 'full'
          ? String(o.mediaWidth)
          : 'default'
      const aspectRatio =
        o.aspectRatio === 'square' ||
        o.aspectRatio === 'portrait' ||
        o.aspectRatio === 'landscape' ||
        o.aspectRatio === 'cinema'
          ? String(o.aspectRatio)
          : 'auto'
      const fit = o.mediaFit === 'contain' ? 'contain' : 'cover'
      const align = o.mediaAlign === 'left' || o.mediaAlign === 'right' ? String(o.mediaAlign) : 'center'
      const radius =
        o.borderRadius === 'none' ||
        o.borderRadius === 'sm' ||
        o.borderRadius === 'md' ||
        o.borderRadius === 'pill'
          ? String(o.borderRadius)
          : 'lg'
      const posX =
        o.mediaPositionX === 'left' || o.mediaPositionX === 'right' ? String(o.mediaPositionX) : 'center'
      const posY =
        o.mediaPositionY === 'top' || o.mediaPositionY === 'bottom' ? String(o.mediaPositionY) : 'center'
      return (
        <div className="tma-console-block-fields">
          <p className="tma-console-block-fields-hint">
            Full-width photo band with text overlay. Use a relative path (e.g. from Media) or an https URL.
          </p>
          <ConsoleInlineMediaField
            label="Image"
            value={typeof o.imageUrl === 'string' ? o.imageUrl : undefined}
            onChange={(next) => set({ imageUrl: next ?? '' })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            helpText="Upload a banner image here or choose one from your Media library."
            folderSuggestion="banners"
          />
          <label className="tma-console-label">
            Image alt (accessibility)
            <input
              className={fieldClass}
              value={String(o.imageAlt ?? '')}
              onChange={(e) => set({ imageAlt: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Headline (optional)
            <input
              className={fieldClass}
              value={String(o.headline ?? '')}
              onChange={(e) => set({ headline: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Subheadline (optional)
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.subheadline ?? '')}
              onChange={(e) => set({ subheadline: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            CTA label (optional)
            <input
              className={fieldClass}
              value={String(o.ctaLabel ?? '')}
              onChange={(e) => set({ ctaLabel: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            CTA URL (optional)
            <input
              className={fieldClass}
              value={String(o.ctaHref ?? '')}
              onChange={(e) => set({ ctaHref: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Overlay darkness
            <select
              className={fieldClass}
              value={
                o.overlay === 'strong' || o.overlay === 'light' || o.overlay === 'medium'
                  ? String(o.overlay)
                  : 'medium'
              }
              onChange={(e) =>
                set({ overlay: e.target.value as 'strong' | 'medium' | 'light' })
              }
              disabled={disabled}
            >
              <option value="light">Light (bright image)</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong (busy photos)</option>
            </select>
          </label>
          <label className="tma-console-label">
            Banner height
            <select
              className={fieldClass}
              value={
                o.height === 'short' || o.height === 'tall' || o.height === 'medium'
                  ? String(o.height)
                  : 'medium'
              }
              onChange={(e) => set({ height: e.target.value as 'short' | 'medium' | 'tall' })}
              disabled={disabled}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="tall">Tall</option>
            </select>
          </label>
          <ConsoleInlineMediaField
            label="Tablet image (optional override)"
            value={typeof o.tabletImageUrl === 'string' ? o.tabletImageUrl : undefined}
            onChange={(next) => set({ tabletImageUrl: next })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            folderSuggestion="banners"
          />
          <ConsoleInlineMediaField
            label="Mobile image (optional override)"
            value={typeof o.mobileImageUrl === 'string' ? o.mobileImageUrl : undefined}
            onChange={(next) => set({ mobileImageUrl: next })}
            altValue={typeof o.imageAlt === 'string' ? o.imageAlt : ''}
            onAltChange={(next) => set({ imageAlt: next })}
            disabled={disabled}
            folderSuggestion="banners"
          />
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Media width
              <select
                className={fieldClass}
                value={mediaWidth}
                onChange={(e) => set({ mediaWidth: e.target.value as 'narrow' | 'default' | 'wide' | 'full' })}
                disabled={disabled}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
                <option value="full">Full bleed</option>
              </select>
            </label>
            <label className="tma-console-label">
              Aspect ratio
              <select
                className={fieldClass}
                value={aspectRatio}
                onChange={(e) => set({ aspectRatio: e.target.value as 'auto' | 'square' | 'portrait' | 'landscape' | 'cinema' })}
                disabled={disabled}
              >
                <option value="auto">Auto</option>
                <option value="square">Square</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="cinema">Cinema</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Fit
              <select
                className={fieldClass}
                value={fit}
                onChange={(e) => set({ mediaFit: e.target.value as 'cover' | 'contain' })}
                disabled={disabled}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            <label className="tma-console-label">
              Alignment
              <select
                className={fieldClass}
                value={align}
                onChange={(e) => set({ mediaAlign: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Focal point X
              <select
                className={fieldClass}
                value={posX}
                onChange={(e) => set({ mediaPositionX: e.target.value as 'left' | 'center' | 'right' })}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="tma-console-label">
              Focal point Y
              <select
                className={fieldClass}
                value={posY}
                onChange={(e) => set({ mediaPositionY: e.target.value as 'top' | 'center' | 'bottom' })}
                disabled={disabled}
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Border radius
              <select
                className={fieldClass}
                value={radius}
                onChange={(e) => set({ borderRadius: e.target.value as 'none' | 'sm' | 'md' | 'lg' | 'pill' })}
                disabled={disabled}
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="pill">Pill / full</option>
              </select>
            </label>
            <label className="tma-console-label">
              Max width (advanced)
              <input
                className={fieldClass}
                value={String(o.maxMediaWidth ?? '')}
                onChange={(e) => set({ maxMediaWidth: e.target.value })}
                disabled={disabled}
                placeholder="e.g. 72rem"
              />
            </label>
          </div>
          <label className="tma-console-label">
            Max height (advanced)
            <input
              className={fieldClass}
              value={String(o.maxMediaHeight ?? '')}
              onChange={(e) => set({ maxMediaHeight: e.target.value })}
              disabled={disabled}
              placeholder="e.g. 32rem"
            />
          </label>
        </div>
      )
    }
    case 'iconRow': {
      const items = asRecordArray(o.items)
      const updateItem = (idx: number, patch: Record<string, unknown>) => {
        const next = items.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (merged.id === undefined || merged.id === null || merged.id === '') {
            merged.id = newBlockId()
          }
          return merged
        })
        set({ items: next })
      }
      const addItem = () => {
        set({
          items: [...items, { id: newBlockId(), icon: '◆', title: 'New item', body: '' }],
        })
      }
      const removeItem = (idx: number) => {
        set({ items: items.filter((_, j) => j !== idx) })
      }
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Section title (optional)
            <input
              className={fieldClass}
              value={String(o.sectionTitle ?? '')}
              onChange={(e) => set({ sectionTitle: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Intro (optional)
            <textarea
              className={fieldClass}
              rows={2}
              value={String(o.intro ?? '')}
              onChange={(e) => set({ intro: e.target.value })}
              disabled={disabled}
            />
          </label>
          {items.map((row, idx) => (
            <div
              key={typeof row.id === 'string' ? row.id : `icon-${idx}`}
              className="tma-console-nested-block"
            >
              <div className="tma-console-nested-block__head">
                <span className="tma-console-nested-block__title">Item {idx + 1}</span>
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  onClick={() => removeItem(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
              <label className="tma-console-label">
                Icon (emoji or symbol, optional)
                <input
                  className={fieldClass}
                  value={String(row.icon ?? '')}
                  onChange={(e) => updateItem(idx, { icon: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="tma-console-label">
                Title
                <input
                  className={fieldClass}
                  value={String(row.title ?? '')}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="tma-console-label">
                Body (optional)
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={String(row.body ?? '')}
                  onChange={(e) => updateItem(idx, { body: e.target.value })}
                  disabled={disabled}
                />
              </label>
            </div>
          ))}
          <button type="button" className="tma-console-btn-secondary" onClick={addItem} disabled={disabled}>
            Add item
          </button>
        </div>
      )
    }
    case 'quoteBand':
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Quote
            <textarea
              className={fieldClass}
              rows={3}
              value={String(o.quote ?? '')}
              onChange={(e) => set({ quote: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Attribution (optional)
            <input
              className={fieldClass}
              value={String(o.attribution ?? '')}
              onChange={(e) => set({ attribution: e.target.value })}
              disabled={disabled}
              placeholder="Name"
            />
          </label>
          <label className="tma-console-label">
            Role / company (optional)
            <input
              className={fieldClass}
              value={String(o.roleLine ?? '')}
              onChange={(e) => set({ roleLine: e.target.value })}
              disabled={disabled}
              placeholder="CEO · Acme"
            />
          </label>
          <label className="tma-console-label">
            Look
            <select
              className={fieldClass}
              value={
                o.variant === 'muted' || o.variant === 'border' || o.variant === 'lime'
                  ? String(o.variant)
                  : 'lime'
              }
              onChange={(e) =>
                set({ variant: e.target.value as 'lime' | 'muted' | 'border' })
              }
              disabled={disabled}
            >
              <option value="lime">Lime accent</option>
              <option value="muted">Muted card</option>
              <option value="border">Outline</option>
            </select>
          </label>
        </div>
      )
    case 'proofBar': {
      const logos = asRecordArray(o.logos)
      const updateLogo = (idx: number, patch: Record<string, unknown>) => {
        const next = logos.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (merged.id === undefined || merged.id === null || merged.id === '') {
            merged.id = newBlockId()
          }
          return merged
        })
        set({ logos: next })
      }
      const addLogo = () => {
        set({
          logos: [...logos, { id: newBlockId(), url: '', alt: 'Logo' }],
        })
      }
      const removeLogo = (idx: number) => {
        set({ logos: logos.filter((_, j) => j !== idx) })
      }
      const logoAlign = o.logoAlign === 'center' ? 'center' : 'start'
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Logo row alignment
            <select
              className={fieldClass}
              value={logoAlign}
              onChange={(e) => set({ logoAlign: e.target.value as 'start' | 'center' })}
              disabled={disabled}
            >
              <option value="start">Start (left)</option>
              <option value="center">Centered</option>
            </select>
          </label>
          <p className="tma-console-block-fields-hint">
            Logo images for the “Trusted by” strip. Use URLs from <strong>Media</strong> or absolute paths.
          </p>
          {logos.length === 0 ? (
            <p className="tma-console-lead">No logos yet.</p>
          ) : (
            logos.map((logo, idx) => (
              <div
                key={typeof logo.id === 'string' || typeof logo.id === 'number' ? String(logo.id) : `logo-${idx}`}
                className="tma-console-nested-block"
              >
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Logo {idx + 1}</span>
                  <button
                    type="button"
                    className="tma-console-btn-danger tma-console-btn-danger--small"
                    onClick={() => removeLogo(idx)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
                <ConsoleInlineMediaField
                  label="Logo image"
                  value={typeof logo.url === 'string' ? logo.url : undefined}
                  onChange={(next) => updateLogo(idx, { url: next ?? '' })}
                  altValue={typeof logo.alt === 'string' ? logo.alt : ''}
                  onAltChange={(next) => updateLogo(idx, { alt: next })}
                  disabled={disabled}
                  folderSuggestion="logos"
                />
                <label className="tma-console-label">
                  Alt text
                  <input
                    className={fieldClass}
                    value={String(logo.alt ?? '')}
                    onChange={(e) => updateLogo(idx, { alt: e.target.value })}
                    disabled={disabled}
                  />
                </label>
              </div>
            ))
          )}
          <button type="button" className="tma-console-btn-secondary" onClick={addLogo} disabled={disabled}>
            Add logo
          </button>
        </div>
      )
    }
    case 'form':
      return <FormBlockQuickPicker o={o} set={set} disabled={disabled} />
    case 'booking':
      return <BookingBlockQuickPicker o={o} set={set} disabled={disabled} />
    case 'testimonialSlider':
      return <TestimonialSliderPicker o={o} set={set} disabled={disabled} />
    case 'pricing': {
      const plans = asRecordArray(o.plans)
      const updatePlan = (idx: number, patch: Record<string, unknown>) => {
        const next = plans.map((row, j) => {
          if (j !== idx) return row
          const merged = { ...row, ...patch }
          if (typeof merged.id !== 'string' || !merged.id) merged.id = newBlockId()
          return merged
        })
        set({ plans: next })
      }
      const addPlan = () => {
        set({
          plans: [
            ...plans,
            { id: newBlockId(), name: 'New plan', price: '$0', cadence: 'monthly', highlighted: false, description: '', bullets: [], ctaLabel: '', ctaHref: '' },
          ],
        })
      }
      const removePlan = (idx: number) => {
        set({ plans: plans.filter((_, j) => j !== idx) })
      }
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Section title
            <input className={fieldClass} value={String(o.sectionTitle ?? '')} onChange={(e) => set({ sectionTitle: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            Intro
            <textarea className={fieldClass} rows={2} value={String(o.intro ?? '')} onChange={(e) => set({ intro: e.target.value })} disabled={disabled} />
          </label>
          {plans.map((plan, idx) => {
            const bullets = asRecordArray(plan.bullets)
            return (
              <div key={typeof plan.id === 'string' ? plan.id : `plan-${idx}`} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Plan {idx + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removePlan(idx)} disabled={disabled}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Name
                  <input className={fieldClass} value={String(plan.name ?? '')} onChange={(e) => updatePlan(idx, { name: e.target.value })} disabled={disabled} />
                </label>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Price
                    <input className={fieldClass} value={String(plan.price ?? '')} onChange={(e) => updatePlan(idx, { price: e.target.value })} disabled={disabled} />
                  </label>
                  <label className="tma-console-label">
                    Cadence
                    <select className={fieldClass} value={String(plan.cadence ?? 'custom')} onChange={(e) => updatePlan(idx, { cadence: e.target.value })} disabled={disabled}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="once">One-time</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>
                <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={Boolean(plan.highlighted)} onChange={(e) => updatePlan(idx, { highlighted: e.target.checked })} disabled={disabled} />
                  Highlighted (featured plan)
                </label>
                <label className="tma-console-label">
                  Description
                  <textarea className={fieldClass} rows={2} value={String(plan.description ?? '')} onChange={(e) => updatePlan(idx, { description: e.target.value })} disabled={disabled} />
                </label>
                <label className="tma-console-label">
                  Bullets (one per line)
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={bullets.map((b) => String(b.text ?? '')).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n')
                      updatePlan(idx, { bullets: lines.map((text) => ({ text, id: newBlockId() })) })
                    }}
                    disabled={disabled}
                  />
                </label>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    CTA label
                    <input className={fieldClass} value={String(plan.ctaLabel ?? '')} onChange={(e) => updatePlan(idx, { ctaLabel: e.target.value })} disabled={disabled} />
                  </label>
                  <label className="tma-console-label">
                    CTA URL
                    <input className={fieldClass} value={String(plan.ctaHref ?? '')} onChange={(e) => updatePlan(idx, { ctaHref: e.target.value })} disabled={disabled} />
                  </label>
                </div>
              </div>
            )
          })}
          <button type="button" className="tma-console-btn-secondary" onClick={addPlan} disabled={disabled}>Add plan</button>
          <label className="tma-console-label">
            Footnote (optional)
            <input className={fieldClass} value={String(o.footnote ?? '')} onChange={(e) => set({ footnote: e.target.value })} disabled={disabled} />
          </label>
        </div>
      )
    }
    case 'comparison': {
      const cols = asRecordArray(o.columns)
      const rows = asRecordArray(o.rows)
      const updateCol = (idx: number, heading: string) => {
        const next = cols.map((c, j) => (j === idx ? { ...c, heading } : c))
        set({ columns: next })
      }
      const addCol = () => set({ columns: [...cols, { heading: 'New column', id: newBlockId() }] })
      const removeCol = (idx: number) => set({ columns: cols.filter((_, j) => j !== idx) })
      const updateRow = (idx: number, patch: Record<string, unknown>) => {
        const next = rows.map((r, j) => (j === idx ? { ...r, ...patch } : r))
        set({ rows: next })
      }
      const addRow = () => {
        set({ rows: [...rows, { label: 'Feature', cells: cols.map(() => ({ value: '', id: newBlockId() })), id: newBlockId() }] })
      }
      const removeRow = (idx: number) => set({ rows: rows.filter((_, j) => j !== idx) })
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Section title
            <input className={fieldClass} value={String(o.sectionTitle ?? '')} onChange={(e) => set({ sectionTitle: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            Intro
            <textarea className={fieldClass} rows={2} value={String(o.intro ?? '')} onChange={(e) => set({ intro: e.target.value })} disabled={disabled} />
          </label>
          <p className="tma-console-block-fields-hint"><strong>Columns</strong></p>
          {cols.map((c, i) => (
            <div key={typeof c.id === 'string' ? c.id : `col-${i}`} className="tma-console-nested-block">
              <div className="tma-console-nested-block__head">
                <span className="tma-console-nested-block__title">Column {i + 1}</span>
                <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removeCol(i)} disabled={disabled}>Remove</button>
              </div>
              <input className={fieldClass} value={String(c.heading ?? '')} onChange={(e) => updateCol(i, e.target.value)} disabled={disabled} />
            </div>
          ))}
          <button type="button" className="tma-console-btn-secondary" onClick={addCol} disabled={disabled}>Add column</button>
          <p className="tma-console-block-fields-hint" style={{ marginTop: '1rem' }}><strong>Rows</strong></p>
          {rows.map((row, ri) => {
            const cells = asRecordArray(row.cells)
            return (
              <div key={typeof row.id === 'string' ? row.id : `row-${ri}`} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Row {ri + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removeRow(ri)} disabled={disabled}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Feature label
                  <input className={fieldClass} value={String(row.label ?? '')} onChange={(e) => updateRow(ri, { label: e.target.value })} disabled={disabled} />
                </label>
                {cols.map((_, ci) => (
                  <label key={ci} className="tma-console-label">
                    {String(cols[ci]?.heading ?? `Col ${ci + 1}`)}
                    <input
                      className={fieldClass}
                      value={String(cells[ci]?.value ?? '')}
                      onChange={(e) => {
                        const nextCells = [...cells]
                        while (nextCells.length <= ci) nextCells.push({ value: '', id: newBlockId() })
                        nextCells[ci] = { ...nextCells[ci], value: e.target.value }
                        updateRow(ri, { cells: nextCells })
                      }}
                      disabled={disabled}
                    />
                  </label>
                ))}
              </div>
            )
          })}
          <button type="button" className="tma-console-btn-secondary" onClick={addRow} disabled={disabled}>Add row</button>
        </div>
      )
    }
    case 'teamGrid':
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Section title
            <input className={fieldClass} value={String(o.sectionTitle ?? '')} onChange={(e) => set({ sectionTitle: e.target.value })} disabled={disabled} />
          </label>
          <label className="tma-console-label">
            Intro
            <textarea className={fieldClass} rows={2} value={String(o.intro ?? '')} onChange={(e) => set({ intro: e.target.value })} disabled={disabled} />
          </label>
          <p className="tma-console-block-fields-hint">
            Team members are managed under <strong>Libraries → Team Members</strong>. The block will render all active members sorted by their sort order. Add or remove them there.
          </p>
        </div>
      )
    case 'caseStudyGrid':
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Section title
            <input className={fieldClass} value={String(o.sectionTitle ?? '')} onChange={(e) => set({ sectionTitle: e.target.value })} disabled={disabled} />
          </label>
          <p className="tma-console-block-fields-hint">
            Case studies are managed under <strong>Libraries → Case Studies</strong>. The block will render the referenced studies. Add or remove them there.
          </p>
        </div>
      )
    case 'rich':
      return (
        <div className="tma-console-block-fields">
          <p className="tma-console-block-fields-hint">
            This is a Lexical rich text block. The content is stored in the page document as JSON. For fine
            control, use <strong>Advanced: raw page data</strong> or edit the Lexical JSON directly.
            Shortcodes like <code>{'{{site_name}}'}</code> are replaced on the public site.
          </p>
        </div>
      )
    case 'spacer': {
      const hVal = (o.height === 'xs' || o.height === 'sm' || o.height === 'md' || o.height === 'lg' || o.height === 'xl') ? String(o.height) : 'md'
      return (
        <div className="tma-console-block-fields">
          <label className="tma-console-label">
            Height
            <select
              className={fieldClass}
              value={hVal}
              onChange={(e) => set({ height: e.target.value as 'xs' | 'sm' | 'md' | 'lg' | 'xl' })}
              disabled={disabled}
            >
              <option value="xs">Extra small (1rem)</option>
              <option value="sm">Small (2rem)</option>
              <option value="md">Medium (3rem)</option>
              <option value="lg">Large (5rem)</option>
              <option value="xl">Extra large (8rem)</option>
            </select>
          </label>
          <p className="tma-console-block-fields-hint">
            Adds vertical whitespace between sections. Use when the section spacing chrome alone is not enough.
          </p>
        </div>
      )
    }
    case 'layoutBlockRef': {
      const idNum = typeof o.layoutBlockId === 'number' && Number.isFinite(o.layoutBlockId) ? o.layoutBlockId : ''
      return (
        <div className="tma-console-block-fields">
          <p className="tma-console-block-fields-hint">
            Content is loaded from <strong>Saved blocks</strong> when visitors view the page. Updating the
            saved block updates every page that links it. Use <strong>Insert copy</strong> in the panel
            above if you need an independent duplicate.
          </p>
          <label className="tma-console-label">
            Saved block id
            <input
              type="number"
              className={fieldClass}
              min={1}
              value={idNum === '' ? '' : String(idNum)}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                set({ layoutBlockId: Number.isFinite(n) && n > 0 ? n : undefined })
              }}
              disabled={disabled}
            />
          </label>
          <label className="tma-console-label">
            Editor label (optional)
            <input
              className={fieldClass}
              value={typeof o.blockName === 'string' ? o.blockName : ''}
              onChange={(e) => set({ blockName: e.target.value.trim() ? e.target.value : undefined })}
              disabled={disabled}
              autoComplete="off"
            />
          </label>
        </div>
      )
    }
    default:
      return (
        <p className="tma-console-lead tma-console-block-fields-hint">
          No quick fields for this block type yet. Use <strong>Advanced: raw page data</strong> for fine
          control, or duplicate a similar page and adjust.
        </p>
      )
  }
}

type RowBodyProps = {
  block: unknown
  index: number
  layout: unknown[]
  layoutLength: number
  applyLayout: (next: unknown[]) => void
  disabled: boolean
  move: (index: number, dir: -1 | 1) => void
  removeAt: (index: number) => void
  duplicateAt: (index: number) => void
  isSelected: boolean
  onSelect: () => void
  insertAt: (index: number) => void
}

function LayoutBlockRowBody(props: RowBodyProps) {
  const {
    block,
    index,
    layout,
    layoutLength,
    applyLayout,
    disabled,
    move,
    removeAt,
    duplicateAt,
    isSelected,
    onSelect,
    insertAt,
  } = props
  return (
    <div
      className="tma-console-layout-row-body-inner"
      data-tma-editor-block-id={
        block && typeof block === 'object' && !Array.isArray(block) && typeof (block as { id?: unknown }).id === 'string'
          ? ((block as { id: string }).id)
          : undefined
      }
    >
      <div className="tma-console-layout-row-head">
        <button
          type="button"
          className={`tma-console-layout-label-btn${isSelected ? ' is-selected' : ''}`}
          onClick={onSelect}
          disabled={disabled}
        >
          {blockLabel(block, index)}
        </button>
        <div className="tma-console-layout-actions">
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={() => move(index, -1)}
            disabled={disabled || index === 0}
            aria-label="Move block up"
          >
            ↑
          </button>
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={() => move(index, 1)}
            disabled={disabled || index === layoutLength - 1}
            aria-label="Move block down"
          >
            ↓
          </button>
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={() => duplicateAt(index)}
            disabled={disabled}
            aria-label="Duplicate block"
          >
            Duplicate
          </button>
          <button
            type="button"
            className="tma-console-btn-danger"
            onClick={() => removeAt(index)}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="tma-console-layout-inline-add">
        <button
          type="button"
          className="tma-console-btn-secondary"
          onClick={() => insertAt(index + 1)}
          disabled={disabled}
          aria-label="Insert section below"
        >
          + Add section below
        </button>
      </div>
      <details className="tma-console-block-details">
        <summary className="tma-console-block-summary">Quick edit fields</summary>
        <SectionChromeQuickFields
          block={block}
          index={index}
          layout={layout}
          applyLayout={applyLayout}
          disabled={disabled}
        />
        <LayoutBlockQuickFields
          block={block}
          index={index}
          layout={layout}
          applyLayout={applyLayout}
          disabled={disabled}
        />
      </details>
    </div>
  )
}

type Props = {
  docText: string
  onDocTextChange: (next: string) => void
  disabled: boolean
  selectedBlockId?: string | null
  onSelectedBlockIdChange?: (id: string | null) => void
  compact?: boolean
}

export const SECTION_PATTERNS: { id: string; label: string; build: () => unknown[] }[] = [
  {
    id: 'hero-cta-proof',
    label: 'Hero + CTA + Proof',
    build: () => [createDefaultLayoutBlock('imageBanner'), createDefaultLayoutBlock('cta'), createDefaultLayoutBlock('proofBar')],
  },
  {
    id: 'services-stack',
    label: 'Text+Media + Stats + FAQ',
    build: () => [createDefaultLayoutBlock('textMedia'), createDefaultLayoutBlock('stats'), createDefaultLayoutBlock('faq')],
  },
  {
    id: 'sales-pricing',
    label: 'Image banner + Pricing + Comparison',
    build: () => [
      createDefaultLayoutBlock('imageBanner'),
      createDefaultLayoutBlock('pricing'),
      createDefaultLayoutBlock('comparison'),
    ],
  },
]

function SavedLayoutBlockInserter(props: {
  layout: unknown[]
  applyLayout: (next: unknown[]) => void
  disabled: boolean
}) {
  const { layout, applyLayout, disabled } = props
  const [rows, setRows] = useState<{ id: number; name: string; active: boolean }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/layout-blocks', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          layoutBlocks?: { id: number; name: string; active: boolean }[]
        }>(res)
        if (cancelled) return
        if (!res.ok || data == null) {
          setErr('Could not load saved blocks')
          return
        }
        setRows((data.layoutBlocks ?? []).filter((r) => r.active))
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function insertCopy() {
    const id = Number.parseInt(pick, 10)
    if (!Number.isFinite(id) || id < 1) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/console/layout-blocks/${id}`, { credentials: 'same-origin' })
      const data = await readResponseJson<{
        ok?: boolean
        layoutBlock?: { block?: unknown }
      }>(res)
      const blockPayload = data?.layoutBlock?.block
      if (!res.ok || blockPayload == null) {
        setErr('Could not load block')
        return
      }
      const cloned = cloneLayoutBlockJson(blockPayload)
      applyLayout([...layout, cloned])
      setPick('')
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  function insertLinked() {
    const id = Number.parseInt(pick, 10)
    if (!Number.isFinite(id) || id < 1) return
    applyLayout([
      ...layout,
      {
        id: newBlockId(),
        blockType: 'layoutBlockRef',
        layoutBlockId: id,
      },
    ])
    setPick('')
  }

  if (disabled) return null

  return (
    <div className="tma-console-block-fields" style={{ marginBottom: '1rem' }}>
      <p className="tma-console-block-fields-hint">
        <strong>Insert copy</strong> duplicates the saved JSON into this page (safe for one-off edits).{' '}
        <strong>Insert linked</strong> keeps a live reference — future edits to the saved block appear
        here automatically.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <div className="tma-console-layout-add" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <label className="tma-console-label tma-console-label--inline">
          Saved block
          <select
            className="tma-console-input"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            disabled={busy || rows.length === 0}
          >
            <option value="">{rows.length === 0 ? 'None yet — create in Libraries' : 'Choose…'}</option>
            {rows.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name} (id {r.id})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy || !pick}
          onClick={() => void insertCopy()}
        >
          {busy ? 'Loading…' : 'Insert copy'}
        </button>
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy || !pick}
          onClick={insertLinked}
          title="Reference the saved block; updates propagate to all linked pages"
        >
          Insert linked
        </button>
      </div>
    </div>
  )
}

export function ConsoleLayoutBlocksPanel({
  docText,
  onDocTextChange,
  disabled,
  selectedBlockId,
  onSelectedBlockIdChange,
  compact,
}: Props) {
  const [addType, setAddType] = useState<LayoutBlockType>('cta')
  const [patternId, setPatternId] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const parsed = useMemo(() => parseLayout(docText), [docText])
  const layout = parsed.ok ? parsed.layout : emptyLayoutRef

  useEffect(() => {
    if (!selectedBlockId) return
    const selector = `[data-tma-editor-block-id="${selectedBlockId}"]`
    const el = document.querySelector(selector)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedBlockId])

  const applyLayout = useCallback(
    (next: unknown[]) => {
      setLocalError(null)
      const merged = mergeLayoutIntoDocText(docText, next)
      if (!merged.ok) {
        setLocalError(merged.error)
        return
      }
      onDocTextChange(merged.text)
    },
    [docText, onDocTextChange],
  )

  useLayoutEffect(() => {
    if (disabled) return
    const p = parseLayout(docText)
    if (!p.ok || p.layout.length === 0) return
    if (p.layout.every(blockHasId)) return
    const merged = mergeLayoutIntoDocText(docText, ensureBlockIds(p.layout))
    if (merged.ok) onDocTextChange(merged.text)
  }, [docText, disabled, onDocTextChange])

  function move(index: number, dir: -1 | 1) {
    if (!parsed.ok) return
    const j = index + dir
    if (j < 0 || j >= layout.length) return
    const next = [...layout]
    const t = next[index]!
    next[index] = next[j]!
    next[j] = t
    applyLayout(next)
  }

  function removeAt(index: number) {
    if (!parsed.ok) return
    const next = layout.filter((_, i) => i !== index)
    applyLayout(next)
  }

  function insertAt(index: number) {
    if (!parsed.ok) return
    const block = createDefaultLayoutBlock(addType)
    const next = [...layout]
    next.splice(Math.max(0, Math.min(index, next.length)), 0, block)
    applyLayout(next)
    if (typeof (block as { id?: unknown }).id === 'string') {
      onSelectedBlockIdChange?.((block as { id: string }).id)
    }
  }

  function duplicateAt(index: number) {
    if (!parsed.ok) return
    const block = layout[index]
    if (!block || typeof block !== 'object' || Array.isArray(block)) return
    const cloned = cloneLayoutBlockJson(block)
    const next = [...layout]
    next.splice(index + 1, 0, cloned)
    applyLayout(next)
  }

  function addBlock() {
    if (!parsed.ok) {
      setLocalError(parsed.error)
      return
    }
    const block = createDefaultLayoutBlock(addType)
    applyLayout([...layout, block])
    if (typeof (block as { id?: unknown }).id === 'string') {
      onSelectedBlockIdChange?.((block as { id: string }).id)
    }
  }

  function insertPattern() {
    if (!parsed.ok) return
    const selected = SECTION_PATTERNS.find((p) => p.id === patternId)
    if (!selected) return
    const nextBlocks = selected.build()
    applyLayout([...layout, ...nextBlocks])
    setPatternId('')
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!parsed.ok) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = layout.map((b, i) => sortableIdForBlock(b, i))
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    applyLayout(arrayMove(layout, oldIndex, newIndex))
  }

  const allHaveIds = parsed.ok && layout.length > 0 && layout.every(blockHasId)
  const sortableIds = useMemo(
    () => (allHaveIds ? layout.map((b) => String((b as Record<string, unknown>).id)) : []),
    [allHaveIds, layout],
  )

  const listContent =
    parsed.ok && layout.length > 0
      ? layout.map((block, index) => {
          const sid = sortableIdForBlock(block, index)
          const body = (
            <LayoutBlockRowBody
              block={block}
              index={index}
              layout={layout}
              layoutLength={layout.length}
              applyLayout={applyLayout}
              disabled={disabled}
              move={move}
              removeAt={removeAt}
              duplicateAt={duplicateAt}
              isSelected={Boolean(
                selectedBlockId &&
                  block &&
                  typeof block === 'object' &&
                  !Array.isArray(block) &&
                  (block as { id?: unknown }).id === selectedBlockId
              )}
              onSelect={() => {
                if (
                  block &&
                  typeof block === 'object' &&
                  !Array.isArray(block) &&
                  typeof (block as { id?: unknown }).id === 'string'
                ) {
                  onSelectedBlockIdChange?.((block as { id: string }).id)
                }
              }}
              insertAt={insertAt}
            />
          )

          if (allHaveIds) {
            return (
              <SortableLayoutBlockRow key={sid} id={String((block as Record<string, unknown>).id)} disabled={disabled}>
                {body}
              </SortableLayoutBlockRow>
            )
          }

          return (
            <li key={sid} className="tma-console-layout-row">
              {body}
            </li>
          )
        })
      : null

  return (
    <fieldset className="tma-console-fieldset tma-console-layout-panel" disabled={disabled}>
      {!compact ? (
        <>
          <legend className="tma-console-subheading">Page sections (no code)</legend>
          <p className="tma-console-hint" style={{ marginTop: 0 }}>
            Build the page with blocks: add a type, drag <strong>⋮⋮</strong> or use arrows to reorder, open{' '}
            <strong>Quick edit fields</strong> for simple text and links. Order here is the order on the site{' '}
            <strong>below the main hero</strong> unless you set <strong>Blocks before main hero</strong> in{' '}
            <strong>Headline, SEO &amp; main button</strong> above. Use <strong>Promo banner</strong>,{' '}
            <strong>Image banner</strong>, <strong>Icon row</strong>, or <strong>Quote band</strong> for visual
            rhythm; pair with <strong>Logo strip</strong>, <strong>Stats</strong>, <strong>Text + media</strong>,{' '}
            <strong>Video</strong>, and <strong>Testimonials</strong>. Check <strong>Responsive preview</strong>{' '}
            after saving.
          </p>
        </>
      ) : null}
      {!compact && parsed.ok ? (
        <SavedLayoutBlockInserter layout={layout} applyLayout={applyLayout} disabled={disabled} />
      ) : null}
      {!parsed.ok ? (
        <p className="tma-console-error" role="alert">
          {parsed.error}
        </p>
      ) : layout.length === 0 ? (
        <p className="tma-console-lead">No sections yet.{!compact ? ' Choose a block type below and click "Add to layout".' : ''}</p>
      ) : allHaveIds ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <ul className="tma-console-layout-list">{listContent}</ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="tma-console-layout-list">{listContent}</ul>
      )}
      {!compact && selectedBlockId ? (
        <div className="tma-console-builder-context">
          <p className="tma-console-block-fields-hint">
            Context settings for selected section. Click a section label to switch quickly.
          </p>
          {layout.map((block, index) => {
            if (
              !block ||
              typeof block !== 'object' ||
              Array.isArray(block) ||
              (block as { id?: unknown }).id !== selectedBlockId
            ) {
              return null
            }
            return (
              <div key={selectedBlockId}>
                <SectionChromeQuickFields
                  block={block}
                  index={index}
                  layout={layout}
                  applyLayout={applyLayout}
                  disabled={disabled}
                />
                <LayoutBlockQuickFields
                  block={block}
                  index={index}
                  layout={layout}
                  applyLayout={applyLayout}
                  disabled={disabled}
                />
              </div>
            )
          })}
        </div>
      ) : null}
      {!compact ? (
        <div className="tma-console-layout-add">
          <label className="tma-console-label tma-console-label--inline">
            Quick pattern
            <select
              className="tma-console-input"
              value={patternId}
              onChange={(e) => setPatternId(e.target.value)}
              disabled={disabled}
            >
              <option value="">Choose starter pattern…</option>
              {SECTION_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tma-console-btn-secondary"
            onClick={insertPattern}
            disabled={disabled || !patternId}
          >
            Insert pattern
          </button>
          <label className="tma-console-label tma-console-label--inline">
            Add block
            <select
              className="tma-console-input"
              value={addType}
              onChange={(e) => setAddType(e.target.value as LayoutBlockType)}
              disabled={disabled}
            >
              {LAYOUT_BLOCK_ADD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="tma-console-submit" onClick={addBlock} disabled={disabled}>
            Add to layout
          </button>
        </div>
      ) : null}
      {localError ? <p className="tma-console-error">{localError}</p> : null}
    </fieldset>
  )
}
