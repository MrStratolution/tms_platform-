'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  pageId: number
  slug: string
  canPermanentlyDelete: boolean
  /** Opens `/preview/[slug]?secret=` — requires `INTERNAL_PREVIEW_SECRET` on server. */
  visualPreviewUrl?: string | null
  showRestore?: boolean
  canRestore?: boolean
  currentStatus?: string
  /** Show status shortcut buttons (content writers). */
  canQuickStatus?: boolean
  /** Publish, unpublish, or trash a live page — admin / ops only. */
  canPublishLive?: boolean
}

export function ConsolePageToolbar(props: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function duplicate() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/console/pages/${props.pageId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        page?: { id: number }
      }>(res)
      if (!res.ok || !data?.page?.id) {
        setError(data?.error ?? 'Duplicate failed')
        return
      }
      router.push(`/console/pages/${data.page.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function patchStatus(status: string, confirmMsg?: string) {
    if (!props.canQuickStatus) return
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/console/pages/${props.pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Update failed')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function restoreDraft() {
    if (!props.canRestore) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/console/pages/${props.pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Restore failed')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function permanentDelete() {
    if (
      !props.canPermanentlyDelete ||
      !window.confirm(
        `Permanently delete page "${props.slug}"? This cannot be undone and removes localizations / A/B rows tied to this page.`,
      )
    ) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/console/pages/${props.pageId}`, { method: 'DELETE' })
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Delete failed')
        return
      }
      router.push('/console/pages')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  const st = props.currentStatus ?? 'draft'
  const showQuick = props.canQuickStatus && st !== 'trashed'
  const pub = props.canPublishLive ?? false

  return (
    <div className="tma-console-page-toolbar">
      {props.visualPreviewUrl ? (
        <a
          href={props.visualPreviewUrl}
          target="_blank"
          rel="noreferrer"
          className="tma-console-btn-secondary"
        >
          Visual preview
        </a>
      ) : null}
      {props.showRestore && props.canRestore ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void restoreDraft()}
        >
          Restore to draft
        </button>
      ) : null}
      {showQuick && pub && (st === 'draft' || st === 'review' || st === 'archived') ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('published')}
        >
          Publish live
        </button>
      ) : null}
      {showQuick && !pub && st === 'draft' ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('review')}
        >
          Submit for review
        </button>
      ) : null}
      {showQuick && st === 'review' ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('draft')}
        >
          Return to draft
        </button>
      ) : null}
      {showQuick && pub && st === 'published' ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('draft')}
        >
          Unpublish
        </button>
      ) : null}
      {showQuick && (st === 'draft' || st === 'review') ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('archived')}
        >
          Archive
        </button>
      ) : null}
      {showQuick && pub && st === 'published' ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('archived')}
        >
          Archive
        </button>
      ) : null}
      {showQuick && st === 'archived' ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() => void patchStatus('draft')}
        >
          Back to draft
        </button>
      ) : null}
      {showQuick && st !== 'trashed' && (st !== 'published' || pub) ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          disabled={busy}
          onClick={() =>
            void patchStatus(
              'trashed',
              `Move "${props.slug}" to trash? It will be hidden from the public site.`,
            )
          }
        >
          Move to trash
        </button>
      ) : null}
      <button
        type="button"
        className="tma-console-btn-secondary"
        disabled={busy}
        onClick={() => void duplicate()}
      >
        Duplicate page
      </button>
      {props.canPermanentlyDelete ? (
        <button
          type="button"
          className="tma-console-btn-danger"
          disabled={busy}
          onClick={() => void permanentDelete()}
        >
          Delete permanently
        </button>
      ) : null}
      {error ? <p className="tma-console-error">{error}</p> : null}
    </div>
  )
}
