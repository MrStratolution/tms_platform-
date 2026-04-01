'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type MediaRow = {
  id: number
  storageKey?: string
  publicUrl: string
  filename: string
  alt: string | null
  mimeType: string | null
  byteSize: number | null
  folder: string | null
  createdAt: string
}

export function ConsoleMediaManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<MediaRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadOk, setUploadOk] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [folderFilter, setFolderFilter] = useState<string>('')

  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/console/media')
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        hint?: string
        media?: MediaRow[]
      }>(res)
      if (!res.ok) {
        const parts = [data?.error, data?.hint].filter(
          (x): x is string => typeof x === 'string' && x.length > 0,
        )
        setLoadError(parts.length ? parts.join(' ') : 'Failed to load media')
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
    void load()
  }, [load])

  const allFolders = useMemo(() => {
    if (!items) return []
    const set = new Set<string>()
    for (const it of items) {
      if (it.folder) set.add(it.folder)
    }
    return [...set].sort()
  }, [items])

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (!folderFilter) return items
    if (folderFilter === '__none__') return items.filter((r) => !r.folder)
    return items.filter((r) => r.folder === folderFilter)
  }, [items, folderFilter])

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canEdit) return
    setUploadError(null)
    setUploadOk(null)
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null
    const file = fileInput?.files?.[0]
    if (!file) {
      setUploadError('Choose a file first.')
      return
    }

    const altEl = form.elements.namedItem('alt') as HTMLInputElement | null
    const folderEl = form.elements.namedItem('folder') as HTMLInputElement | null
    const fd = new FormData()
    fd.set('file', file)
    if (altEl?.value?.trim()) fd.set('alt', altEl.value.trim())
    if (folderEl?.value?.trim()) fd.set('folder', folderEl.value.trim())

    setUploading(true)
    try {
      const res = await fetch('/api/console/media', { method: 'POST', body: fd })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        hint?: string
        media?: MediaRow
      }>(res)
      if (!res.ok) {
        const parts = [data?.error, data?.hint].filter(
          (x): x is string => typeof x === 'string' && x.length > 0,
        )
        setUploadError(parts.length ? parts.join(' ') : 'Upload failed')
        return
      }
      setUploadOk(`Uploaded: ${data?.media?.filename ?? file.name}`)
      form.reset()
      await load()
    } catch {
      setUploadError('Network error during upload.')
    } finally {
      setUploading(false)
    }
  }

  async function copyUrl(url: string, id: number) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <div className="tma-console-media-manager">
      {!canEdit ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Upload is disabled for your role.
        </p>
      ) : (
        <form className="tma-console-form tma-console-media-upload" onSubmit={onUpload}>
          <h2 className="tma-console-subheading">Upload</h2>
          <p className="tma-console-lead" style={{ marginTop: 0 }}>
            Images: JPEG, PNG, WebP, GIF, SVG up to 8MB. Videos: MP4, WebM, MOV up to 50MB. Files are stored under{' '}
            <code>public/uploads/cms/</code>.
          </p>
          <label className="tma-console-label">
            File
            <input name="file" type="file" accept="image/*,.svg,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={uploading} />
          </label>
          <label className="tma-console-label">
            Alt text (optional)
            <input
              name="alt"
              className="tma-console-input"
              type="text"
              disabled={uploading}
              autoComplete="off"
            />
          </label>
          <label className="tma-console-label">
            Folder (optional)
            <input
              name="folder"
              className="tma-console-input"
              type="text"
              disabled={uploading}
              autoComplete="off"
              placeholder="e.g. brand, icons, photos"
              list="media-folder-suggestions"
            />
            <datalist id="media-folder-suggestions">
              {allFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <div className="tma-console-actions">
            <button type="submit" className="tma-console-submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          {uploadError ? <p className="tma-console-error">{uploadError}</p> : null}
          {uploadOk ? <p className="tma-console-success">{uploadOk}</p> : null}
        </form>
      )}

      <h2 className="tma-console-subheading">Library</h2>

      {!loading && items && items.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <label className="tma-console-label tma-console-label--inline" style={{ margin: 0 }}>
            Filter by folder
            <select
              className="tma-console-input"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="">All folders</option>
              <option value="__none__">Uncategorized</option>
              {allFolders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <span className="tma-console-muted">{filteredItems.length} file{filteredItems.length === 1 ? '' : 's'}</span>
        </div>
      ) : null}

      {loading ? (
        <p className="tma-console-lead">Loading…</p>
      ) : loadError ? (
        <p className="tma-console-error" role="alert">
          {loadError}
        </p>
      ) : items && items.length === 0 ? (
        <p className="tma-console-lead">No uploads yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">Preview</th>
                <th scope="col">File</th>
                <th scope="col">Folder</th>
                <th scope="col">URL</th>
                <th scope="col">Size</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.mimeType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="tma-console-media-thumb"
                        src={row.publicUrl}
                        alt={row.alt ?? ''}
                        width={56}
                        height={56}
                        loading="lazy"
                      />
                    ) : row.mimeType?.startsWith('video/') ? (
                      <video className="tma-console-media-thumb" src={row.publicUrl} muted playsInline />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <code>{row.filename}</code>
                    {row.alt ? (
                      <>
                        <br />
                        <span className="tma-console-muted">alt: {row.alt}</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    <span className="tma-console-muted">{row.folder || '—'}</span>
                  </td>
                  <td>
                    <code className="tma-console-code-break">{row.publicUrl}</code>
                    <br />
                    <button
                      type="button"
                      className="tma-console-link-button"
                      onClick={() => void copyUrl(row.publicUrl, row.id)}
                    >
                      {copiedId === row.id ? 'Copied' : 'Copy URL'}
                    </button>
                  </td>
                  <td>
                    {row.byteSize != null ? `${(row.byteSize / 1024).toFixed(1)} KB` : '—'}
                  </td>
                  <td>
                    <time dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
