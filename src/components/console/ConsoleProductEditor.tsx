'use client'

import { useCallback, useState } from 'react'

import { ConsoleInlineMediaField } from '@/components/console/ConsoleInlineMediaField'
import { isLikelyEmbeddableVideoUrl } from '@/lib/videoEmbed'
import { readResponseJson } from '@/lib/safeJson'
import { PRODUCT_CONTENT_KIND_VALUES, type ProductContentKind } from '@/types/cms'

const fieldClass = 'tma-console-input tma-console-input--compact'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function asArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return []
  return v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[]
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asBool(v: unknown): boolean {
  return v === true
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

type Props = {
  id: number
  initialSlug: string
  initialName: string
  initialStatus: string
  initialContentKind: string
  initialPublishedAt?: string | null
  initialListingPriority?: number | null
  initialShowInProjectFeeds?: boolean | null
  initialDocument: Record<string, unknown>
  canEdit: boolean
}

function dateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function ConsoleProductEditor({
  id,
  initialSlug,
  initialName,
  initialStatus,
  initialContentKind,
  initialPublishedAt,
  initialListingPriority,
  initialShowInProjectFeeds,
  initialDocument,
  canEdit,
}: Props) {
  const [slug, setSlug] = useState(initialSlug)
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState(initialStatus === 'published' ? 'published' : 'draft')
  const [contentKind, setContentKind] = useState<ProductContentKind>(
    PRODUCT_CONTENT_KIND_VALUES.includes(initialContentKind as ProductContentKind)
      ? (initialContentKind as ProductContentKind)
      : 'product',
  )
  const [publishedAt, setPublishedAt] = useState(() => dateInputValue(initialPublishedAt))
  const [listingPriority, setListingPriority] = useState(
    initialListingPriority == null ? '' : String(initialListingPriority),
  )
  const [showInProjectFeeds, setShowInProjectFeeds] = useState(initialShowInProjectFeeds === true)
  const [doc, setDoc] = useState<Record<string, unknown>>(() => ({ ...initialDocument }))
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState(() => JSON.stringify(initialDocument, null, 2))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const patch = useCallback((p: Record<string, unknown>) => {
    setDoc((prev) => ({ ...prev, ...p }))
  }, [])

  const patchNested = useCallback((key: string, p: Record<string, unknown>) => {
    setDoc((prev) => {
      const existing = (prev[key] && typeof prev[key] === 'object' && !Array.isArray(prev[key])) ? prev[key] as Record<string, unknown> : {}
      return { ...prev, [key]: { ...existing, ...p } }
    })
  }, [])

  function switchToRaw() {
    setRawText(JSON.stringify(doc, null, 2))
    setRawMode(true)
  }

  function switchToStructured() {
    try {
      const parsed: unknown = JSON.parse(rawText)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Document must be a JSON object.')
        return
      }
      setDoc(parsed as Record<string, unknown>)
      setRawMode(false)
      setError(null)
    } catch {
      setError('Document is not valid JSON. Fix it before switching.')
    }
  }

  function buildDocument(): Record<string, unknown> | null {
    if (rawMode) {
      try {
        const parsed: unknown = JSON.parse(rawText)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setError('Document must be a JSON object.')
          return null
        }
        return parsed as Record<string, unknown>
      } catch {
        setError('Document is not valid JSON.')
        return null
      }
    }
    return doc
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const document = buildDocument()
    if (!document) return

    const nameTrim = name.trim()
    const slugTrim = slug.trim()
    if (!nameTrim || !slugTrim) {
      setError('Name and slug are required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrim,
          slug: slugTrim,
          status,
          contentKind,
          publishedAt: publishedAt || null,
          listingPriority: listingPriority === '' ? null : Number.parseInt(listingPriority, 10),
          showInProjectFeeds,
          document,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        product?: {
          updatedAt: string
          document?: unknown
          slug?: string
          name?: string
          status?: string
          contentKind?: string
          publishedAt?: string | null
          listingPriority?: number | null
          showInProjectFeeds?: boolean
        }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.product?.updatedAt ?? Date.now()).toLocaleString()}`)
      const p = data?.product
      if (p?.document && typeof p.document === 'object') {
        const d = p.document as Record<string, unknown>
        setDoc(d)
        setRawText(JSON.stringify(d, null, 2))
      }
      if (typeof p?.slug === 'string') setSlug(p.slug)
      if (typeof p?.name === 'string') setName(p.name)
      if (typeof p?.status === 'string') setStatus(p.status === 'published' ? 'published' : 'draft')
      if (typeof p?.contentKind === 'string' && PRODUCT_CONTENT_KIND_VALUES.includes(p.contentKind as ProductContentKind)) {
        setContentKind(p.contentKind as ProductContentKind)
      }
      setPublishedAt(dateInputValue(p?.publishedAt ?? null))
      setListingPriority(p?.listingPriority == null ? '' : String(p.listingPriority))
      setShowInProjectFeeds(p?.showInProjectFeeds === true)
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit
  const dis = saving || readOnly

  const modules = asArr(doc.modules)
  const faqs = asArr(doc.faqs)
  const pricing = (doc.pricing && typeof doc.pricing === 'object' && !Array.isArray(doc.pricing)) ? doc.pricing as Record<string, unknown> : null
  const plans = pricing ? asArr(pricing.plans) : []
  const primaryCta = asObj(doc.primaryCta)
  const seo = asObj(doc.seo)
  const toggles = asObj(doc.toggles)
  const galleryItems = asArr(doc.galleryItems)
  const videoShowcase = asObj(doc.videoShowcase)
  const heroMediaMode = asStr(doc.heroMediaMode, 'image') === 'video' ? 'video' : 'image'

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}

      <p className="tma-console-lead">
        Public page at <code>/products/{slug || '[slug]'}</code>. Slug must stay URL-safe (lowercase, hyphens).
      </p>

      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Showcase basics</legend>
        <label className="tma-console-label">
          Name
          <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={dis} autoComplete="off" />
        </label>
        <label className="tma-console-label">
          Slug
          <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} autoComplete="off" />
        </label>
        <label className="tma-console-label">
          Status
          <select className="tma-console-input" value={status} onChange={(e) => setStatus(e.target.value === 'published' ? 'published' : 'draft')} disabled={dis}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="tma-console-label">
          Content type
          <select
            className="tma-console-input"
            value={contentKind}
            onChange={(e) =>
              setContentKind(
                PRODUCT_CONTENT_KIND_VALUES.includes(e.target.value as ProductContentKind)
                  ? (e.target.value as ProductContentKind)
                  : 'product',
              )
            }
            disabled={dis}
          >
            {PRODUCT_CONTENT_KIND_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Publishing date
            <input
              className="tma-console-input"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={dis}
            />
          </label>
          <label className="tma-console-label">
            Listing priority
            <input
              className="tma-console-input"
              type="number"
              value={listingPriority}
              onChange={(e) => setListingPriority(e.target.value)}
              disabled={dis}
            />
          </label>
        </div>
        <label className="tma-console-label" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={showInProjectFeeds}
            onChange={(e) => setShowInProjectFeeds(e.target.checked)}
            disabled={dis}
          />
          Show in Projects page feeds
        </label>
      </fieldset>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <button
          type="button"
          className={rawMode ? 'tma-console-btn-secondary' : 'tma-console-submit'}
          onClick={() => { if (rawMode) switchToStructured() }}
          disabled={!rawMode}
        >
          Structured editor
        </button>
        <button
          type="button"
          className={rawMode ? 'tma-console-submit' : 'tma-console-btn-secondary'}
          onClick={() => { if (!rawMode) switchToRaw() }}
          disabled={rawMode}
        >
          Raw JSON
        </button>
      </div>

      {rawMode ? (
        <label className="tma-console-label">
          Document (JSON)
          <textarea
            className="tma-console-textarea-json"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={dis}
            spellCheck={false}
          />
        </label>
      ) : (
        <>
          {/* Hero / tagline */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Hero &amp; tagline</legend>
            <label className="tma-console-label">
              Tagline
              <input className={fieldClass} value={asStr(doc.tagline)} onChange={(e) => patch({ tagline: e.target.value })} disabled={dis} placeholder="Short value proposition" />
            </label>
            <ConsoleInlineMediaField
              label="Cover image"
              value={asStr(doc.coverImageUrl) || undefined}
              onChange={(next) => patch({ coverImageUrl: next ?? '' })}
              altValue={asStr(doc.coverImageAlt)}
              onAltChange={(next) => patch({ coverImageAlt: next })}
              disabled={dis}
              folderSuggestion="products"
              helpText="Main visual shown on the public product page when hero media is set to image."
            />
            <label className="tma-console-label">
              Hero media type
              <select
                className={fieldClass}
                value={heroMediaMode}
                onChange={(e) => patch({ heroMediaMode: e.target.value === 'video' ? 'video' : 'image' })}
                disabled={dis}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
            {heroMediaMode === 'video' ? (
              <>
                <ConsoleInlineMediaField
                  label="Hero video"
                  value={asStr(doc.heroVideoUrl) || undefined}
                  onChange={(next) => patch({ heroVideoUrl: next ?? '' })}
                  disabled={dis}
                  folderSuggestion="products"
                  mediaKind="video"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  uploadLabel="Upload hero video"
                  chooseLabel="Choose hero video"
                  helpText="Upload a product video or paste an embeddable URL below if you prefer an external player."
                />
                <label className="tma-console-label">
                  External hero video URL (optional)
                  <input
                    className={fieldClass}
                    value={asStr(doc.heroVideoUrl)}
                    onChange={(e) => patch({ heroVideoUrl: e.target.value })}
                    disabled={dis}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </label>
                <ConsoleInlineMediaField
                  label="Hero video poster"
                  value={asStr(doc.heroVideoPosterUrl) || undefined}
                  onChange={(next) => patch({ heroVideoPosterUrl: next ?? '' })}
                  disabled={dis}
                  folderSuggestion="products"
                  helpText="Used before playback starts and as a visual fallback."
                />
                <label className="tma-console-label">
                  Hero video caption
                  <input
                    className={fieldClass}
                    value={asStr(doc.heroVideoCaption)}
                    onChange={(e) => patch({ heroVideoCaption: e.target.value })}
                    disabled={dis}
                  />
                </label>
                {asStr(doc.heroVideoUrl) && isLikelyEmbeddableVideoUrl(asStr(doc.heroVideoUrl)) ? (
                  <p className="tma-console-block-fields-hint">
                    External hero video will render in an embed player on the public page.
                  </p>
                ) : null}
              </>
            ) : null}
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                Primary CTA label
                <input className={fieldClass} value={asStr(primaryCta.label)} onChange={(e) => patchNested('primaryCta', { label: e.target.value })} disabled={dis} />
              </label>
              <label className="tma-console-label">
                Primary CTA URL
                <input className={fieldClass} value={asStr(primaryCta.href)} onChange={(e) => patchNested('primaryCta', { href: e.target.value })} disabled={dis} />
              </label>
            </div>
          </fieldset>

          {/* Modules / benefits */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Modules / benefits</legend>
            <p className="tma-console-block-fields-hint">What the product includes or key benefits. Renders as a feature list on the public page.</p>
            {modules.map((m, i) => (
              <div key={asStr(m.id, `mod-${i}`)} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Module {i + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ modules: modules.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Title
                  <input className={fieldClass} value={asStr(m.title)} onChange={(e) => { const next = [...modules]; next[i] = { ...m, title: e.target.value }; patch({ modules: next }) }} disabled={dis} />
                </label>
                <label className="tma-console-label">
                  Body
                  <textarea className={fieldClass} rows={2} value={asStr(m.body)} onChange={(e) => { const next = [...modules]; next[i] = { ...m, body: e.target.value }; patch({ modules: next }) }} disabled={dis} />
                </label>
              </div>
            ))}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ modules: [...modules, { id: newId(), title: 'New module', body: '' }] })} disabled={dis}>Add module</button>
          </fieldset>

          {/* Gallery */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Gallery</legend>
            <label className="tma-console-label">
              Section title
              <input
                className={fieldClass}
                value={asStr(doc.galleryTitle)}
                onChange={(e) => patch({ galleryTitle: e.target.value })}
                disabled={dis}
                placeholder="Optional gallery headline"
              />
            </label>
            <label className="tma-console-label">
              Intro
              <textarea
                className={fieldClass}
                rows={2}
                value={asStr(doc.galleryIntro)}
                onChange={(e) => patch({ galleryIntro: e.target.value })}
                disabled={dis}
              />
            </label>
            {galleryItems.map((item, i) => {
              const mediaMode = asStr(item.mediaMode, 'image') === 'video' ? 'video' : 'image'
              const nextItems = [...galleryItems]
              const updateItem = (changes: Record<string, unknown>) => {
                nextItems[i] = { ...item, ...changes }
                patch({ galleryItems: nextItems })
              }
              return (
                <div key={asStr(item.id, `gallery-${i}`)} className="tma-console-nested-block">
                  <div className="tma-console-nested-block__head">
                    <span className="tma-console-nested-block__title">Gallery item {i + 1}</span>
                    <button
                      type="button"
                      className="tma-console-btn-danger tma-console-btn-danger--small"
                      onClick={() => patch({ galleryItems: galleryItems.filter((_, j) => j !== i) })}
                      disabled={dis}
                    >
                      Remove
                    </button>
                  </div>
                  <label className="tma-console-label">
                    Media type
                    <select
                      className={fieldClass}
                      value={mediaMode}
                      onChange={(e) =>
                        updateItem({
                          mediaMode: e.target.value === 'video' ? 'video' : 'image',
                          imageUrl: e.target.value === 'video' ? '' : item.imageUrl,
                          videoUrl: e.target.value === 'image' ? '' : item.videoUrl,
                        })
                      }
                      disabled={dis}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                  {mediaMode === 'video' ? (
                    <>
                      <ConsoleInlineMediaField
                        label="Gallery video"
                        value={asStr(item.videoUrl) || undefined}
                        onChange={(next) => updateItem({ videoUrl: next ?? '' })}
                        disabled={dis}
                        folderSuggestion="products"
                        mediaKind="video"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        uploadLabel="Upload gallery video"
                        chooseLabel="Choose gallery video"
                      />
                      <label className="tma-console-label">
                        External gallery video URL (optional)
                        <input
                          className={fieldClass}
                          value={asStr(item.videoUrl)}
                          onChange={(e) => updateItem({ videoUrl: e.target.value })}
                          disabled={dis}
                          placeholder="https://vimeo.com/..."
                        />
                      </label>
                      <ConsoleInlineMediaField
                        label="Poster image"
                        value={asStr(item.posterUrl) || undefined}
                        onChange={(next) => updateItem({ posterUrl: next ?? '' })}
                        disabled={dis}
                        folderSuggestion="products"
                      />
                    </>
                  ) : (
                    <ConsoleInlineMediaField
                      label="Gallery image"
                      value={asStr(item.imageUrl) || undefined}
                      onChange={(next) => updateItem({ imageUrl: next ?? '' })}
                      altValue={asStr(item.imageAlt)}
                      onAltChange={(next) => updateItem({ imageAlt: next })}
                      disabled={dis}
                      folderSuggestion="products"
                    />
                  )}
                  <label className="tma-console-label">
                    Caption
                    <input
                      className={fieldClass}
                      value={asStr(item.caption)}
                      onChange={(e) => updateItem({ caption: e.target.value })}
                      disabled={dis}
                    />
                  </label>
                </div>
              )
            })}
            <button
              type="button"
              className="tma-console-btn-secondary"
              onClick={() =>
                patch({
                  galleryItems: [
                    ...galleryItems,
                    { id: newId(), mediaMode: 'image', imageUrl: '', imageAlt: '', caption: '' },
                  ],
                })
              }
              disabled={dis}
            >
              Add gallery item
            </button>
          </fieldset>

          {/* Video showcase */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Video showcase</legend>
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                Eyebrow
                <input
                  className={fieldClass}
                  value={asStr(videoShowcase.eyebrow)}
                  onChange={(e) => patchNested('videoShowcase', { eyebrow: e.target.value })}
                  disabled={dis}
                />
              </label>
              <label className="tma-console-label">
                Title
                <input
                  className={fieldClass}
                  value={asStr(videoShowcase.title)}
                  onChange={(e) => patchNested('videoShowcase', { title: e.target.value })}
                  disabled={dis}
                />
              </label>
            </div>
            <label className="tma-console-label">
              Description
              <textarea
                className={fieldClass}
                rows={3}
                value={asStr(videoShowcase.description)}
                onChange={(e) => patchNested('videoShowcase', { description: e.target.value })}
                disabled={dis}
              />
            </label>
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                Video source
                <select
                  className={fieldClass}
                  value={asStr(videoShowcase.sourceType, 'upload')}
                  onChange={(e) =>
                    patchNested('videoShowcase', {
                      sourceType: e.target.value === 'external' ? 'external' : 'upload',
                    })
                  }
                  disabled={dis}
                >
                  <option value="upload">Uploaded video</option>
                  <option value="external">External URL</option>
                </select>
              </label>
              <label className="tma-console-label">
                Aspect ratio
                <select
                  className={fieldClass}
                  value={asStr(videoShowcase.aspectRatio, '16:9')}
                  onChange={(e) => patchNested('videoShowcase', { aspectRatio: e.target.value })}
                  disabled={dis}
                >
                  <option value="16:9">Landscape 16:9</option>
                  <option value="4:5">Portrait 4:5</option>
                  <option value="1:1">Square 1:1</option>
                </select>
              </label>
            </div>
            {asStr(videoShowcase.sourceType, 'upload') === 'external' ? (
              <label className="tma-console-label">
                External video URL
                <input
                  className={fieldClass}
                  value={asStr(videoShowcase.externalUrl)}
                  onChange={(e) => patchNested('videoShowcase', { externalUrl: e.target.value })}
                  disabled={dis}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
            ) : (
              <ConsoleInlineMediaField
                label="Uploaded video"
                value={asStr(videoShowcase.uploadedVideoUrl) || undefined}
                onChange={(next) => patchNested('videoShowcase', { uploadedVideoUrl: next ?? '' })}
                disabled={dis}
                folderSuggestion="products"
                mediaKind="video"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                uploadLabel="Upload showcase video"
                chooseLabel="Choose showcase video"
              />
            )}
            <ConsoleInlineMediaField
              label="Poster image"
              value={asStr(videoShowcase.posterUrl) || undefined}
              onChange={(next) => patchNested('videoShowcase', { posterUrl: next ?? '' })}
              disabled={dis}
              folderSuggestion="products"
            />
            <label className="tma-console-label">
              Caption
              <input
                className={fieldClass}
                value={asStr(videoShowcase.caption)}
                onChange={(e) => patchNested('videoShowcase', { caption: e.target.value })}
                disabled={dis}
              />
            </label>
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                CTA label
                <input
                  className={fieldClass}
                  value={asStr(videoShowcase.ctaLabel)}
                  onChange={(e) => patchNested('videoShowcase', { ctaLabel: e.target.value })}
                  disabled={dis}
                />
              </label>
              <label className="tma-console-label">
                CTA URL
                <input
                  className={fieldClass}
                  value={asStr(videoShowcase.ctaHref)}
                  onChange={(e) => patchNested('videoShowcase', { ctaHref: e.target.value })}
                  disabled={dis}
                />
              </label>
            </div>
            <div className="tma-console-field-row">
              <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={asBool(videoShowcase.autoplay)}
                  onChange={(e) =>
                    patchNested('videoShowcase', {
                      autoplay: e.target.checked,
                      muted: e.target.checked ? true : asBool(videoShowcase.muted),
                    })
                  }
                  disabled={dis}
                />
                Autoplay
              </label>
              <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={videoShowcase.autoplay === true ? true : asBool(videoShowcase.muted)}
                  onChange={(e) => patchNested('videoShowcase', { muted: e.target.checked })}
                  disabled={dis || asBool(videoShowcase.autoplay)}
                />
                Muted
              </label>
              <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={asBool(videoShowcase.loop)}
                  onChange={(e) => patchNested('videoShowcase', { loop: e.target.checked })}
                  disabled={dis}
                />
                Loop
              </label>
              <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={videoShowcase.controls !== false}
                  onChange={(e) => patchNested('videoShowcase', { controls: e.target.checked })}
                  disabled={dis}
                />
                Show controls
              </label>
            </div>
            <p className="tma-console-block-fields-hint">
              Autoplay is only applied when the video is muted. Leave this section empty if the product page does not need a showcase video.
            </p>
          </fieldset>

          {/* Deliverables */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Deliverables</legend>
            <p className="tma-console-block-fields-hint">Concrete deliverables the client receives.</p>
            {asArr(doc.deliverables).map((d, i) => {
              const deliverables = asArr(doc.deliverables)
              return (
                <div key={asStr(d.id, `del-${i}`)} className="tma-console-nested-block">
                  <div className="tma-console-nested-block__head">
                    <span className="tma-console-nested-block__title">Deliverable {i + 1}</span>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ deliverables: deliverables.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                  </div>
                  <label className="tma-console-label">
                    Title
                    <input className={fieldClass} value={asStr(d.title)} onChange={(e) => { const next = [...deliverables]; next[i] = { ...d, title: e.target.value }; patch({ deliverables: next }) }} disabled={dis} />
                  </label>
                  <label className="tma-console-label">
                    Description
                    <textarea className={fieldClass} rows={2} value={asStr(d.description)} onChange={(e) => { const next = [...deliverables]; next[i] = { ...d, description: e.target.value }; patch({ deliverables: next }) }} disabled={dis} />
                  </label>
                </div>
              )
            })}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ deliverables: [...asArr(doc.deliverables), { id: newId(), title: '', description: '' }] })} disabled={dis}>Add deliverable</button>
          </fieldset>

          {/* Pricing */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Pricing</legend>
            <label className="tma-console-label">
              Section title
              <input className={fieldClass} value={asStr(pricing?.sectionTitle)} onChange={(e) => patchNested('pricing', { sectionTitle: e.target.value })} disabled={dis} />
            </label>
            <label className="tma-console-label">
              Intro
              <textarea className={fieldClass} rows={2} value={asStr(pricing?.intro)} onChange={(e) => patchNested('pricing', { intro: e.target.value })} disabled={dis} />
            </label>
            {plans.map((plan, i) => {
              const bullets = asArr(plan.bullets)
              const updatePlan = (p: Record<string, unknown>) => {
                const next = [...plans]
                next[i] = { ...plan, ...p }
                patchNested('pricing', { plans: next })
              }
              return (
                <div key={asStr(plan.id, `plan-${i}`)} className="tma-console-nested-block">
                  <div className="tma-console-nested-block__head">
                    <span className="tma-console-nested-block__title">Plan {i + 1}</span>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patchNested('pricing', { plans: plans.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                  </div>
                  <label className="tma-console-label">
                    Name
                    <input className={fieldClass} value={asStr(plan.name)} onChange={(e) => updatePlan({ name: e.target.value })} disabled={dis} />
                  </label>
                  <div className="tma-console-field-row">
                    <label className="tma-console-label">
                      Price
                      <input className={fieldClass} value={asStr(plan.price)} onChange={(e) => updatePlan({ price: e.target.value })} disabled={dis} />
                    </label>
                    <label className="tma-console-label">
                      Cadence
                      <select className={fieldClass} value={asStr(plan.cadence, 'custom')} onChange={(e) => updatePlan({ cadence: e.target.value })} disabled={dis}>
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                        <option value="once">One-time</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                  </div>
                  <label className="tma-console-label">
                    Description
                    <textarea className={fieldClass} rows={2} value={asStr(plan.description)} onChange={(e) => updatePlan({ description: e.target.value })} disabled={dis} />
                  </label>
                  <label className="tma-console-label">
                    Bullets (one per line)
                    <textarea
                      className={fieldClass}
                      rows={3}
                      value={bullets.map((b) => asStr(b.text)).join('\n')}
                      onChange={(e) => updatePlan({ bullets: e.target.value.split('\n').map((text) => ({ text, id: newId() })) })}
                      disabled={dis}
                    />
                  </label>
                  <div className="tma-console-field-row">
                    <label className="tma-console-label">
                      CTA label
                      <input className={fieldClass} value={asStr(plan.ctaLabel)} onChange={(e) => updatePlan({ ctaLabel: e.target.value })} disabled={dis} />
                    </label>
                    <label className="tma-console-label">
                      CTA URL
                      <input className={fieldClass} value={asStr(plan.ctaHref)} onChange={(e) => updatePlan({ ctaHref: e.target.value })} disabled={dis} />
                    </label>
                  </div>
                </div>
              )
            })}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patchNested('pricing', { plans: [...plans, { id: newId(), name: 'New plan', price: '$0', cadence: 'monthly', description: '', bullets: [], ctaLabel: '', ctaHref: '' }] })} disabled={dis}>Add plan</button>
          </fieldset>

          {/* FAQs */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">FAQs</legend>
            {faqs.map((faq, i) => (
              <div key={asStr(faq.id, `faq-${i}`)} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">FAQ {i + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ faqs: faqs.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Question
                  <input className={fieldClass} value={asStr(faq.question)} onChange={(e) => { const next = [...faqs]; next[i] = { ...faq, question: e.target.value }; patch({ faqs: next }) }} disabled={dis} />
                </label>
                <label className="tma-console-label">
                  Answer
                  <textarea className={fieldClass} rows={3} value={asStr(faq.answer)} onChange={(e) => { const next = [...faqs]; next[i] = { ...faq, answer: e.target.value }; patch({ faqs: next }) }} disabled={dis} />
                </label>
              </div>
            ))}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ faqs: [...faqs, { id: newId(), question: '', answer: '' }] })} disabled={dis}>Add FAQ</button>
          </fieldset>

          {/* SEO */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">SEO overrides</legend>
            <label className="tma-console-label">
              Meta title
              <input className={fieldClass} value={asStr(seo.title)} onChange={(e) => patchNested('seo', { title: e.target.value })} disabled={dis} placeholder="Falls back to product name" />
            </label>
            <label className="tma-console-label">
              Meta description
              <textarea className={fieldClass} rows={2} value={asStr(seo.description)} onChange={(e) => patchNested('seo', { description: e.target.value })} disabled={dis} />
            </label>
          </fieldset>

          {/* Toggles */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Page toggles</legend>
            <p className="tma-console-block-fields-hint">Control which sections appear on the public product page.</p>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showBookingCta)} onChange={(e) => patchNested('toggles', { showBookingCta: e.target.checked })} disabled={dis} />
              Show booking CTA
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showLeadForm)} onChange={(e) => patchNested('toggles', { showLeadForm: e.target.checked })} disabled={dis} />
              Show lead capture form
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showStickyCta)} onChange={(e) => patchNested('toggles', { showStickyCta: e.target.checked })} disabled={dis} />
              Show sticky CTA bar
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showComparison)} onChange={(e) => patchNested('toggles', { showComparison: e.target.checked })} disabled={dis} />
              Show comparison table
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showTimeline)} onChange={(e) => patchNested('toggles', { showTimeline: e.target.checked })} disabled={dis} />
              Show process / timeline
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showTestimonials)} onChange={(e) => patchNested('toggles', { showTestimonials: e.target.checked })} disabled={dis} />
              Show testimonials
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showDownloads)} onChange={(e) => patchNested('toggles', { showDownloads: e.target.checked })} disabled={dis} />
              Show downloads / resources
            </label>
          </fieldset>
        </>
      )}

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      {canEdit ? (
        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
