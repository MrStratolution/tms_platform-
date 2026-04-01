'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type MediaRow = {
  id: number
  storageKey: string
  publicUrl: string
  filename: string
  alt: string | null
  mimeType: string | null
  byteSize: number | null
  folder: string | null
  createdAt: string
}

type MediaResponse = {
  ok?: boolean
  error?: string
  hint?: string
  media?: MediaRow[]
}

type UploadResponse = {
  ok?: boolean
  error?: string
  hint?: string
  media?: MediaRow
}

type Props = {
  label: string
  value: string | null | undefined
  onChange: (next: string | undefined) => void
  disabled?: boolean
  altValue?: string | null | undefined
  onAltChange?: (next: string) => void
  helpText?: string
  folderSuggestion?: string
  accept?: string
  mediaKind?: 'image' | 'video' | 'any'
  uploadLabel?: string
  chooseLabel?: string
}

function asRenderableSrc(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed
  return `/${trimmed.replace(/^\/+/, '')}`
}

function inferMediaKind(
  src: string | null | undefined,
  mimeType?: string | null,
): 'image' | 'video' {
  if (mimeType?.startsWith('video/')) return 'video'
  const clean = src?.toLowerCase() ?? ''
  if (/\.(mp4|webm|mov)(\?|#|$)/.test(clean)) return 'video'
  return 'image'
}

export function ConsoleInlineMediaField({
  label,
  value,
  onChange,
  disabled = false,
  altValue,
  onAltChange,
  helpText,
  folderSuggestion,
  accept = 'image/*,.svg',
  mediaKind = 'image',
  uploadLabel,
  chooseLabel,
}: Props) {
  const [items, setItems] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadOk, setUploadOk] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState(folderSuggestion ?? '')
  const [altDraft, setAltDraft] = useState(altValue ?? '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAltDraft(altValue ?? '')
  }, [altValue])

  useEffect(() => {
    setFolder(folderSuggestion ?? '')
  }, [folderSuggestion])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/console/media', { credentials: 'same-origin' })
      const data = await readResponseJson<MediaResponse>(res)
      if (!res.ok) {
        const parts = [data?.error, data?.hint].filter(
          (part): part is string => typeof part === 'string' && part.length > 0,
        )
        setLoadError(parts.length ? parts.join(' ') : 'Failed to load media.')
        setItems([])
        return
      }
      setItems(Array.isArray(data?.media) ? data.media : [])
    } catch {
      setLoadError('Network error loading media.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!libraryOpen) return
    if (items.length > 0 || loading) return
    void load()
  }, [items.length, libraryOpen, load, loading])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const allowed = items.filter((item) => {
      if (mediaKind === 'any') return true
      return mediaKind === 'video'
        ? item.mimeType?.startsWith('video/')
        : item.mimeType?.startsWith('image/')
    })
    if (!q) return allowed.slice(0, 18)
    return allowed
      .filter((item) => {
        const haystack = `${item.filename} ${item.alt ?? ''} ${item.folder ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 18)
  }, [items, mediaKind, search])

  const currentSrc = asRenderableSrc(value)
  const currentKind = inferMediaKind(currentSrc)

  function applyMedia(row: MediaRow) {
    onChange(row.storageKey)
    if (onAltChange && (!altValue || !altValue.trim()) && row.alt?.trim()) {
      onAltChange(row.alt.trim())
    }
    setLibraryOpen(false)
    setUploadOpen(false)
    setUploadOk(`Selected ${row.filename}`)
  }

  async function onUpload() {
    if (disabled) return
    setUploadError(null)
    setUploadOk(null)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setUploadError('Choose a file first.')
      return
    }

    const fd = new FormData()
    fd.set('file', file)
    if (altDraft.trim()) fd.set('alt', altDraft.trim())
    if (folder.trim()) fd.set('folder', folder.trim())

    setUploading(true)
    try {
      const res = await fetch('/api/console/media', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      })
      const data = await readResponseJson<UploadResponse>(res)
      if (!res.ok || !data?.media) {
        const parts = [data?.error, data?.hint].filter(
          (part): part is string => typeof part === 'string' && part.length > 0,
        )
        setUploadError(parts.length ? parts.join(' ') : 'Upload failed.')
        return
      }
      applyMedia(data.media)
      if (onAltChange && altDraft.trim()) onAltChange(altDraft.trim())
      await load()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadError('Network error during upload.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="tma-console-label">
      <span>{label}</span>
      {helpText ? <span className="tma-console-block-fields-hint">{helpText}</span> : null}
      {currentSrc ? (
        <div
          style={{
            marginTop: '0.5rem',
            marginBottom: '0.75rem',
            border: '1px solid rgba(231, 248, 200, 0.14)',
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {currentKind === 'video' ? (
            <video
              src={currentSrc}
              controls
              muted
              playsInline
              style={{ width: '100%', maxHeight: '220px', display: 'block', background: '#000' }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSrc}
              alt={altValue?.trim() || ''}
              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginTop: currentSrc ? 0 : '0.5rem',
          marginBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          className="tma-console-btn-secondary"
          onClick={() => {
            setUploadOpen((open) => !open)
            setLibraryOpen(false)
          }}
          disabled={disabled}
        >
          {uploadOpen
            ? 'Close upload'
            : currentSrc
              ? uploadLabel ?? 'Replace with upload'
              : uploadLabel ?? (mediaKind === 'video' ? 'Upload video' : 'Upload image')}
        </button>
        <button
          type="button"
          className="tma-console-btn-secondary"
          onClick={() => {
            setLibraryOpen((open) => !open)
            setUploadOpen(false)
          }}
          disabled={disabled}
        >
          {libraryOpen
            ? 'Close library'
            : currentSrc
              ? chooseLabel ?? 'Choose another file'
              : chooseLabel ?? 'Choose from media'}
        </button>
        {currentSrc ? (
          <button
            type="button"
            className="tma-console-btn-danger tma-console-btn-danger--small"
            onClick={() => onChange(undefined)}
            disabled={disabled}
          >
            Clear
          </button>
        ) : null}
      </div>

      {currentSrc ? (
        <p className="tma-console-muted" style={{ marginTop: 0 }}>
          Stored value: <code className="tma-console-code-break">{value}</code>
        </p>
      ) : (
        <p className="tma-console-muted" style={{ marginTop: 0 }}>
          No {mediaKind === 'video' ? 'video' : 'image'} selected.
        </p>
      )}

      {uploadOpen ? (
        <div
          className="tma-console-form"
          style={{
            marginTop: '0.75rem',
            padding: '0.9rem',
            border: '1px solid rgba(231, 248, 200, 0.12)',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <label className="tma-console-label">
            File
            <input
              ref={fileInputRef}
              name="file"
              type="file"
              accept={accept}
              disabled={disabled || uploading}
            />
          </label>
          <label className="tma-console-label">
            Alt text (optional)
            <input
              className="tma-console-input tma-console-input--compact"
              type="text"
              value={altDraft}
              onChange={(event) => setAltDraft(event.target.value)}
              disabled={disabled || uploading}
            />
          </label>
          <label className="tma-console-label">
            Folder (optional)
            <input
              className="tma-console-input tma-console-input--compact"
              type="text"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="e.g. page-builder, banners, logos"
              disabled={disabled || uploading}
            />
          </label>
          <div className="tma-console-actions">
            <button
              type="button"
              className="tma-console-submit"
              onClick={() => void onUpload()}
              disabled={disabled || uploading}
            >
              {uploading ? 'Uploading…' : 'Upload and use'}
            </button>
          </div>
          {uploadError ? <p className="tma-console-error">{uploadError}</p> : null}
        </div>
      ) : null}

      {libraryOpen ? (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.9rem',
            border: '1px solid rgba(231, 248, 200, 0.12)',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <label className="tma-console-label">
            Search media
            <input
              className="tma-console-input tma-console-input--compact"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filename, alt text, folder"
              disabled={disabled}
            />
          </label>
          {loading ? <p className="tma-console-lead">Loading media…</p> : null}
          {loadError ? <p className="tma-console-error">{loadError}</p> : null}
          {!loading && !loadError && filteredItems.length === 0 ? (
            <p className="tma-console-lead">No media matches this search.</p>
          ) : null}
          {!loading && !loadError && filteredItems.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="tma-console-btn-secondary"
                  onClick={() => applyMedia(item)}
                  disabled={disabled}
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    padding: '0.5rem',
                    height: 'auto',
                  }}
                >
                  {inferMediaKind(item.publicUrl, item.mimeType) === 'video' ? (
                    <video
                      src={item.publicUrl}
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '92px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        display: 'block',
                        marginBottom: '0.5rem',
                        background: '#000',
                      }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.publicUrl}
                      alt={item.alt ?? ''}
                      style={{
                        width: '100%',
                        height: '92px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    />
                  )}
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      lineHeight: 1.3,
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.filename}
                  </strong>
                  <span className="tma-console-muted" style={{ fontSize: '0.8rem' }}>
                    {item.folder || 'Uncategorized'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {uploadOk ? <p className="tma-console-success">{uploadOk}</p> : null}
    </div>
  )
}
