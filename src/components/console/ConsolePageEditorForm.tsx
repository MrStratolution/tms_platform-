'use client'

import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Columns3,
  Diamond,
  Download,
  Folder,
  FolderOpen,
  HelpCircle,
  Image,
  Layers,
  LayoutTemplate,
  MessageSquareQuote,
  MousePointerClick,
  Megaphone,
  MoveVertical,
  Pin,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Settings,
  Star,
  Table2,
  Type,
  Undo2,
  Users,
  Wallet,
  ArrowLeft,
  Paintbrush,
  Pencil,
  SlidersHorizontal,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Monitor,
  Smartphone,
  Newspaper,
  Boxes,
} from 'lucide-react'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ConsoleLayoutBlocksPanel,
  blockLabel,
  LayoutBlockQuickFields,
  mergeLayoutIntoDocText,
  patchBlockAt,
  parseLayout,
  SECTION_PATTERNS,
} from '@/components/console/ConsoleLayoutBlocksPanel'
import { ConsolePageTranslationsPanel } from '@/components/console/ConsolePageTranslationsPanel'
import { createDefaultLayoutBlock, type LayoutBlockType } from '@/lib/cms/layoutBlockPresets'
import { canonicalizeHeroDocument } from '@/lib/cms/canonicalHeroBlock'
import {
  extractPageSurfaceFromDocument,
  mergePageSurfaceIntoDocument,
  mergedPageDocumentSchema,
  normalizePageBuilderDocument,
  type PageSurfaceFields,
} from '@/lib/cms/pageSurfaceMerge'
import { buildTemplateLayout, type BuilderTemplateId } from '@/lib/console/pageBuilderTemplates'
import { getDocumentForLocaleEditor, upsertDocumentLocale } from '@/lib/documentLocalization'
import { readResponseJson } from '@/lib/safeJson'

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing' },
  { value: 'blank', label: 'Blank' },
  { value: 'services', label: 'Services' },
  { value: 'contact', label: 'Contact' },
  { value: 'thank_you', label: 'Thank-you' },
  { value: 'product', label: 'Product' },
  { value: 'industry', label: 'Industry' },
  { value: 'home', label: 'Home' },
  { value: 'resource', label: 'Resource' },
  { value: 'other', label: 'Other' },
] as const

type SidebarTab = 'sections' | 'add' | 'edit' | 'settings'

type BlockPickerItem = { type: LayoutBlockType; Icon: ComponentType<{ size?: number; className?: string }>; label: string }

const BLOCK_PICKER_ITEMS: BlockPickerItem[] = [
  { type: 'hero', Icon: LayoutTemplate, label: 'Hero' },
  { type: 'imageBanner', Icon: Image, label: 'Image Banner' },
  { type: 'textMedia', Icon: Columns3, label: 'Text + Media' },
  { type: 'cta', Icon: MousePointerClick, label: 'Button' },
  { type: 'promoBanner', Icon: Megaphone, label: 'Promo Banner' },
  { type: 'stats', Icon: BarChart3, label: 'Stats' },
  { type: 'faq', Icon: HelpCircle, label: 'FAQ' },
  { type: 'video', Icon: Play, label: 'Video' },
  { type: 'mediaGallery', Icon: Image, label: 'Gallery' },
  { type: 'iconRow', Icon: Diamond, label: 'Icon Row' },
  { type: 'quoteBand', Icon: MessageSquareQuote, label: 'Quote' },
  { type: 'process', Icon: RefreshCw, label: 'Process' },
  { type: 'proofBar', Icon: Star, label: 'Logo Strip' },
  { type: 'pricing', Icon: Wallet, label: 'Pricing' },
  { type: 'comparison', Icon: Table2, label: 'Compare' },
  { type: 'servicesFocus', Icon: Layers, label: 'Services Focus' },
  { type: 'form', Icon: ClipboardList, label: 'Form' },
  { type: 'booking', Icon: CalendarCheck, label: 'Booking' },
  { type: 'testimonialSlider', Icon: MessageSquareQuote, label: 'Testimonials' },
  { type: 'teamGrid', Icon: Users, label: 'Team' },
  { type: 'caseStudyGrid', Icon: Folder, label: 'Case Studies' },
  { type: 'featuredProjectSpotlight', Icon: FolderOpen, label: 'Featured Project' },
  { type: 'resourceFeed', Icon: Newspaper, label: 'News Feed' },
  { type: 'productFeed', Icon: Boxes, label: 'Projects Feed' },
  { type: 'download', Icon: Download, label: 'Download' },
  { type: 'rich', Icon: Type, label: 'Rich Text' },
  { type: 'spacer', Icon: MoveVertical, label: 'Spacer' },
  { type: 'stickyCta', Icon: Pin, label: 'Sticky CTA' },
]

type PageStatus = 'draft' | 'review' | 'published' | 'archived' | 'trashed'

type Props = {
  pageId: number
  initialSlug: string
  initialTitle: string
  initialPageType: string
  initialStatus: PageStatus
  initialDocument: Record<string, unknown>
  editingLocale?: 'de' | 'en'
  canEdit: boolean
  /** Admin/ops: can set published and move live pages. */
  canPublishLive?: boolean
  /** Ops/admin: page-level custom CSS field is shown and persisted. */
  canEditCustomCss?: boolean
  selectedBlockId?: string | null
  onSelectedBlockIdChange?: (id: string | null) => void
  previewSlot?: React.ReactNode
}

type LocalRevision = {
  id: string
  label: string
  createdAt: string
  docText: string
  surface: PageSurfaceFields
  title: string
  slug: string
  pageType: string
  status: PageStatus
}

type StoredRevision = {
  id: number
  title: string
  slug: string
  pageType: string
  status: PageStatus
  document: Record<string, unknown>
  createdAt: string
  actorEmail?: string | null
  reason?: string | null
}

function normalizeStatus(s: string): PageStatus {
  if (
    s === 'published' ||
    s === 'draft' ||
    s === 'review' ||
    s === 'archived' ||
    s === 'trashed'
  )
    return s
  return 'draft'
}

function historyPush(base: string[], value: string): string[] {
  if (base[base.length - 1] === value) return base
  return [...base, value].slice(-80)
}

function layoutBlockCount(docText: string): number {
  try {
    const parsed = JSON.parse(docText) as { layout?: unknown }
    if (!Array.isArray(parsed.layout)) return 0
    return parsed.layout.filter(
      (b) =>
        b &&
        typeof b === 'object' &&
        !Array.isArray(b) &&
        (b as { blockType?: unknown }).blockType !== 'stickyCta',
    ).length
  } catch {
    return 0
  }
}

export function ConsolePageEditorForm({
  pageId,
  initialSlug,
  initialTitle,
  initialPageType,
  initialStatus,
  initialDocument,
  editingLocale = 'de',
  canEdit,
  canPublishLive = false,
  canEditCustomCss = false,
  selectedBlockId: selectedBlockIdExternal,
  onSelectedBlockIdChange,
  previewSlot,
}: Props) {
  const initialEditableState = useMemo(
    () =>
      canonicalizeHeroDocument(
        normalizePageBuilderDocument(getDocumentForLocaleEditor(initialDocument, editingLocale)),
        {
          stripLegacyFields: true,
        },
      ),
    [initialDocument, editingLocale],
  )
  const initialEditableDocument = initialEditableState.document
  const initialSurface = useMemo(
    () => extractPageSurfaceFromDocument(initialEditableDocument),
    [initialEditableDocument],
  )

  const [baseDocument, setBaseDocument] = useState<Record<string, unknown>>(initialDocument)
  const [slug, setSlug] = useState(initialSlug)
  const [pageType, setPageType] = useState(initialPageType)
  const [title, setTitle] = useState(initialTitle)
  const [status, setStatus] = useState<PageStatus>(normalizeStatus(initialStatus))
  const [surface, setSurface] = useState<PageSurfaceFields>(initialSurface)
  const [docText, setDocText] = useState(() =>
    JSON.stringify(initialEditableDocument, null, 2),
  )
  const [selectedBlockIdLocal, setSelectedBlockIdLocal] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>(() => [JSON.stringify(initialEditableDocument, null, 2)])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyIndexRef = useRef(historyIndex)
  historyIndexRef.current = historyIndex
  const [revisions, setRevisions] = useState<LocalRevision[]>([])
  const [storedRevisions, setStoredRevisions] = useState<StoredRevision[]>([])
  const [pendingRestore, setPendingRestore] = useState<LocalRevision | null>(null)
  const [templateId, setTemplateId] = useState<BuilderTemplateId | ''>('')
  const [publishChecklistOpen, setPublishChecklistOpen] = useState(false)
  const [publishChecklistBypass, setPublishChecklistBypass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const selectedBlockId = selectedBlockIdExternal ?? selectedBlockIdLocal
  const setSelectedBlockId = onSelectedBlockIdChange ?? setSelectedBlockIdLocal
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('sections')
  const [pickerSearch, setPickerSearch] = useState('')
  const [editSubTab, setEditSubTab] = useState<'content' | 'style' | 'advanced'>('content')

  const draftKey = `tma-builder-draft-${pageId}-${editingLocale}`
  const revisionsKey = `tma-builder-revisions-${pageId}-${editingLocale}`
  const localeMode = editingLocale === 'en' ? 'en' : 'de'
  const localeScopedReadOnly = localeMode !== 'de'
  const legacyHeroAutoConverted = initialEditableState.autoConvertedLegacyHero
  const dirty =
    docText !== history[0] ||
    (!localeScopedReadOnly && (title !== initialTitle || slug !== initialSlug))
  const formRef = useRef<HTMLFormElement>(null)
  const publishChecks = useMemo(
    () => [
      {
        id: 'seo-title',
        label: 'SEO title is set',
        ok: surface.seoTitle.trim().length > 0,
      },
      {
        id: 'seo-description',
        label: 'SEO description is set',
        ok: surface.seoDescription.trim().length >= 50,
      },
      {
        id: 'layout',
        label: 'At least one visible page section exists',
        ok: layoutBlockCount(docText) > 0,
      },
    ],
    [docText, surface.seoDescription, surface.seoTitle],
  )

  function updateSurface<K extends keyof PageSurfaceFields>(key: K, value: string) {
    setSurface((s) => ({ ...s, [key]: value }))
  }

  const getCanonicalEditableDocument = useCallback(
    (document: Record<string, unknown>) =>
      canonicalizeHeroDocument(
        normalizePageBuilderDocument(getDocumentForLocaleEditor(document, localeMode)),
        {
          stripLegacyFields: true,
        },
      ).document,
    [localeMode],
  )

  const applyDocText = useCallback((next: string, trackHistory = true) => {
    setDocText(next)
    if (!trackHistory) return
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1)
      const nextHistory = historyPush(trimmed, next)
      setHistoryIndex(nextHistory.length - 1)
      return nextHistory
    })
  }, [])

  const undoDoc = useCallback(() => {
    setHistoryIndex((idx) => {
      const next = Math.max(0, idx - 1)
      const value = history[next]
      if (value != null) setDocText(value)
      return next
    })
  }, [history])

  const redoDoc = useCallback(() => {
    setHistoryIndex((idx) => {
      const next = Math.min(history.length - 1, idx + 1)
      const value = history[next]
      if (value != null) setDocText(value)
      return next
    })
  }, [history])

  useEffect(() => {
    let cancelled = false
    async function loadStoredRevisions() {
      try {
        const res = await fetch(`/api/console/pages/${pageId}/revisions`, {
          credentials: 'same-origin',
        })
        const data = await readResponseJson<{ revisions?: StoredRevision[] }>(res)
        if (!cancelled && res.ok) {
          setStoredRevisions(Array.isArray(data?.revisions) ? data.revisions : [])
        }
      } catch {
        if (!cancelled) setStoredRevisions([])
      }
    }
    void loadStoredRevisions()
    return () => {
      cancelled = true
    }
  }, [pageId])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(revisionsKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as LocalRevision[]
      if (Array.isArray(parsed)) setRevisions(parsed)
    } catch {
      // ignore malformed local cache
    }
  }, [revisionsKey])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as LocalRevision
      if (!parsed || typeof parsed !== 'object' || parsed.docText === docText) return
      setPendingRestore(parsed)
    } catch {
      // ignore malformed local cache
    }
    // only on first mount for a page id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const snapshot: LocalRevision = {
          id: `draft-${Date.now()}`,
          label: 'Autosave draft',
          createdAt: new Date().toISOString(),
          docText,
          surface,
          title,
          slug,
          pageType,
          status,
        }
        window.localStorage.setItem(draftKey, JSON.stringify(snapshot))
      } catch {
        // storage may be unavailable
      }
    }, 900)
    return () => window.clearTimeout(timer)
  }, [docText, draftKey, pageType, slug, status, surface, title])

  function createRevision(label = 'Manual snapshot') {
    const snapshot: LocalRevision = {
      id: `rev-${Date.now()}`,
      label,
      createdAt: new Date().toISOString(),
      docText,
      surface,
      title,
      slug,
      pageType,
      status,
    }
    const next = [snapshot, ...revisions].slice(0, 20)
    setRevisions(next)
    try {
      window.localStorage.setItem(revisionsKey, JSON.stringify(next))
    } catch {
      // ignore
    }
    setSuccess('Snapshot saved locally.')
  }

  function restoreRevision(rev: LocalRevision) {
    if (!localeScopedReadOnly) {
      setTitle(rev.title)
      setSlug(rev.slug)
      setPageType(rev.pageType)
      setStatus(rev.status)
    }
    setSurface(rev.surface)
    setDocText(rev.docText)
    setHistory([rev.docText])
    setHistoryIndex(0)
    setPendingRestore(null)
    setSuccess('Revision restored in editor. Save to publish changes.')
  }

  async function restoreStoredRevision(revisionId: number) {
    if (saving || readOnly) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/console/pages/${pageId}/revisions`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      })
      const data = await readResponseJson<{
        error?: string
        page?: {
          title: string
          slug: string
          pageType: string
          status: string
          document: Record<string, unknown>
          updatedAt: string
        }
      }>(res)
      if (!res.ok || !data?.page) {
        setError(data?.error ?? 'Restore failed')
        return
      }
      setTitle(data.page.title)
      setSlug(data.page.slug)
      setPageType(data.page.pageType)
      setStatus(normalizeStatus(data.page.status))
      const nextBase = data.page.document
      setBaseDocument(nextBase)
      const nextEditable = getCanonicalEditableDocument(nextBase)
      const nextText = JSON.stringify(nextEditable, null, 2)
      setDocText(nextText)
      setHistory([nextText])
      setHistoryIndex(0)
      setSurface(extractPageSurfaceFromDocument(nextEditable))
      setSuccess(`Revision restored at ${new Date(data.page.updatedAt).toLocaleString()}`)
    } catch {
      setError('Network error while restoring revision.')
    } finally {
      setSaving(false)
    }
  }

  function applyTemplate() {
    if (!templateId) return
    try {
      const parsed = JSON.parse(docText) as Record<string, unknown>
      const next = { ...parsed, layout: buildTemplateLayout(templateId) }
      applyDocText(JSON.stringify(next, null, 2), true)
      setSuccess('Starter template inserted. Review and customize each section.')
    } catch {
      setError('Cannot apply template while JSON is invalid.')
    }
  }

  useEffect(() => {
    if (!canEdit) return
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        if (!saving) formRef.current?.requestSubmit()
        return
      }
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoDoc()
        else undoDoc()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, redoDoc, saving, undoDoc])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let parsedBase: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(docText)
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        setError('Document must be a JSON object (not an array or primitive).')
        return
      }
      parsedBase = parsed as Record<string, unknown>
    } catch {
      setError('Document is not valid JSON.')
      return
    }

    const merged = mergePageSurfaceIntoDocument(parsedBase, surface)
    const checked = mergedPageDocumentSchema.safeParse(merged)
    if (!checked.success) {
      setError(
        checked.error.flatten().formErrors.join('; ') || 'Invalid document',
      )
      return
    }

    let documentPayload: Record<string, unknown> = checked.data as Record<string, unknown>
    if (!canEditCustomCss) {
      const { customCss: _omit, ...rest } = documentPayload
      void _omit
      documentPayload = rest
    }

    if (localeMode === 'en') {
      documentPayload = upsertDocumentLocale(baseDocument, 'en', documentPayload)
    }

    const trimmed = title.trim()
    if (!trimmed) {
      setError('Title is required.')
      return
    }

    const slugTrim = slug.trim()
    if (!slugTrim) {
      setError('Slug is required.')
      return
    }

    if (status === 'published' && canPublishLive && !publishChecklistBypass) {
      setPublishChecklistOpen(true)
      setError(null)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          status,
          slug: slugTrim,
          pageType,
          document: documentPayload,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        page?: {
          updatedAt: string
          document?: unknown
          slug?: string
          pageType?: string
          status?: string
        }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.page?.updatedAt ?? Date.now()).toLocaleString()}`)
      if (data?.page?.slug) setSlug(data.page.slug)
      if (data?.page?.pageType) setPageType(data.page.pageType)
      if (data?.page?.status) setStatus(normalizeStatus(data.page.status))
      if (data?.page?.document && typeof data.page.document === 'object') {
        const d = data.page.document as Record<string, unknown>
        setBaseDocument(d)
        const nextEditable = getCanonicalEditableDocument(d)
        const nextText = JSON.stringify(nextEditable, null, 2)
        setDocText(nextText)
        setHistory([nextText])
        setHistoryIndex(0)
        setSurface(extractPageSurfaceFromDocument(nextEditable))
      }
      setPublishChecklistBypass(false)
      setPublishChecklistOpen(false)
      refreshPreview()
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit
  const baseSettingsDisabled = saving || readOnly || localeScopedReadOnly
  const statusLocked = !canPublishLive && status === 'published'
  useEffect(() => {
    if (status !== 'published') setPublishChecklistBypass(false)
  }, [status])

  useEffect(() => {
    if (selectedBlockId) {
      setSidebarTab('edit')
      setEditSubTab('content')
    }
  }, [selectedBlockId])

  const currentLayout = useMemo(() => {
    const p = parseLayout(docText)
    return p.ok ? p.layout : []
  }, [docText])

  const selectedBlockData = useMemo(() => {
    if (!selectedBlockId) return { block: null as unknown, index: -1 }
    const index = currentLayout.findIndex(
      (b) =>
        b &&
        typeof b === 'object' &&
        !Array.isArray(b) &&
        (b as Record<string, unknown>).id === selectedBlockId,
    )
    return { block: index >= 0 ? currentLayout[index] : null, index }
  }, [currentLayout, selectedBlockId])

  const broadcastToPreview = useCallback((msg: Record<string, unknown>) => {
    for (let i = 0; i < window.frames.length; i++) {
      try { window.frames[i].postMessage(msg, '*') } catch { /* cross-origin frame */ }
    }
  }, [])

  const pushLayoutToPreview = useCallback((layout: unknown[]) => {
    try {
      broadcastToPreview({ type: 'tma-preview-live-layout', layout: JSON.parse(JSON.stringify(layout)) })
    } catch { /* serialisation error */ }
  }, [broadcastToPreview])

  const refreshPreview = useCallback(() => {
    broadcastToPreview({ type: 'tma-preview-refresh' })
  }, [broadcastToPreview])

  const pushLayoutDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const debouncedPushLayout = useCallback((layout: unknown[]) => {
    clearTimeout(pushLayoutDebounceRef.current)
    pushLayoutDebounceRef.current = setTimeout(() => pushLayoutToPreview(layout), 120)
  }, [pushLayoutToPreview])

  const applyLayoutFromSidebar = useCallback(
    (next: unknown[]) => {
      const merged = mergeLayoutIntoDocText(docText, next)
      if (merged.ok) {
        applyDocText(merged.text, true)
        debouncedPushLayout(next)
      }
    },
    [docText, applyDocText, debouncedPushLayout],
  )

  function addBlockFromPicker(blockType: LayoutBlockType) {
    const block = createDefaultLayoutBlock(blockType)
    applyLayoutFromSidebar([...currentLayout, block])
    if (typeof (block as { id?: unknown }).id === 'string') {
      setSelectedBlockId((block as { id: string }).id)
    }
  }

  return (
    <form ref={formRef} className="tma-builder" onSubmit={onSave}>
      {readOnly ? (
        <div className="tma-builder__message tma-builder__message--error">
          <strong>View only.</strong> Your role cannot edit content.
        </div>
      ) : null}
      {localeMode === 'en' ? (
        <div className="tma-builder__message tma-builder__message--info">
          <strong>Editing English overlay.</strong> Section content, hero, CTA, and SEO save into the
          page&apos;s English localization overlay. Internal title, slug, status, and publish workflow stay
          on the German base page.
        </div>
      ) : null}
      {legacyHeroAutoConverted ? (
        <div className="tma-builder__message tma-builder__message--info">
          <strong>Legacy hero converted.</strong> This page previously used page-level hero fields. The
          hero now appears as a normal section in the builder and will save back in the canonical
          section layout format.
        </div>
      ) : null}

      <header className="tma-builder__topbar">
        <div className="tma-builder__topbar-left">
          <span className={`tma-builder__status${dirty ? ' tma-builder__status--dirty' : ''}`}>
            {dirty ? '● Unsaved' : '✓ Saved'}
          </span>
          <span className="tma-builder__locale-pill">
            {localeMode === 'en' ? 'English overlay' : 'German base'}
          </span>
        </div>
        <div className="tma-builder__topbar-center">
          <input
            className="tma-builder__title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            disabled={saving || readOnly || localeScopedReadOnly}
            autoComplete="off"
          />
        </div>
        <div className="tma-builder__topbar-right">
          <select
            className="tma-builder__status-select"
            value={status}
            onChange={(e) => setStatus(normalizeStatus(e.target.value))}
            disabled={saving || readOnly || statusLocked || localeScopedReadOnly}
          >
            {statusLocked ? (
              <option value="published">published</option>
            ) : (
              <>
                <option value="draft">draft</option>
                <option value="review">review</option>
                {canPublishLive ? <option value="published">published</option> : null}
                <option value="archived">archived</option>
                <option value="trashed">trashed</option>
              </>
            )}
          </select>
          <button type="button" className="tma-builder__icon-btn" onClick={undoDoc} disabled={saving || readOnly || historyIndex <= 0} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
          <button type="button" className="tma-builder__icon-btn" onClick={redoDoc} disabled={saving || readOnly || historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
          <button type="submit" className="tma-builder__save-btn" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {error ? <div className="tma-builder__message tma-builder__message--error">{error}</div> : null}
      {success ? <div className="tma-builder__message tma-builder__message--success">{success}</div> : null}

      {publishChecklistOpen ? (
        <div className="tma-builder__message tma-builder__message--checklist">
          <strong>Pre-publish checklist</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
            {publishChecks.map((check) => (
              <li key={check.id} style={{ fontSize: '0.8rem', color: check.ok ? 'var(--tma-lime)' : '#fde68a' }}>
                {check.ok ? '✓' : '!'} {check.label}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="tma-builder__icon-btn" onClick={() => setPublishChecklistOpen(false)}>Fix first</button>
            <button type="button" className="tma-builder__save-btn" onClick={() => { setPublishChecklistBypass(true); setPublishChecklistOpen(false); formRef.current?.requestSubmit() }}>Publish anyway</button>
          </div>
        </div>
      ) : null}

      {pendingRestore ? (
        <div className="tma-builder__message tma-builder__message--info">
          Found a local autosave from {new Date(pendingRestore.createdAt).toLocaleString()}.
          <span style={{ display: 'inline-flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
            <button type="button" className="tma-builder__icon-btn" onClick={() => restoreRevision(pendingRestore)}>Restore</button>
            <button type="button" className="tma-builder__icon-btn" onClick={() => setPendingRestore(null)}>Dismiss</button>
          </span>
        </div>
      ) : null}

      <div className="tma-builder__body">
        <aside className="tma-builder__sidebar">
          <nav className="tma-builder__tabs" role="tablist">
            <button type="button" role="tab" className={`tma-builder__tab${sidebarTab === 'sections' ? ' tma-builder__tab--active' : ''}`} onClick={() => { setSelectedBlockId(null); setSidebarTab('sections') }}>
              <Layers size={14} /> Sections
            </button>
            <button type="button" role="tab" className={`tma-builder__tab${sidebarTab === 'add' ? ' tma-builder__tab--active' : ''}`} onClick={() => setSidebarTab('add')}>
              <Plus size={14} /> Add
            </button>
            <button type="button" role="tab" className={`tma-builder__tab${sidebarTab === 'settings' ? ' tma-builder__tab--active' : ''}`} onClick={() => setSidebarTab('settings')}>
              <Settings size={14} /> Page
            </button>
          </nav>

          <div className="tma-builder__sidebar-scroll">
            {sidebarTab === 'sections' ? (
              <ConsoleLayoutBlocksPanel
                docText={docText}
                onDocTextChange={(next) => applyDocText(next, true)}
                disabled={saving || readOnly}
                selectedBlockId={selectedBlockId}
                onSelectedBlockIdChange={setSelectedBlockId}
                compact
              />
            ) : null}

            {sidebarTab === 'add' ? (
              <div className="tma-builder-picker">
                <input
                  type="search"
                  className="tma-builder-picker__search"
                  placeholder="Search blocks…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  autoComplete="off"
                />
                <div className="tma-builder-picker__grid">
                  {BLOCK_PICKER_ITEMS
                    .filter(item => !pickerSearch || item.label.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map(item => (
                      <button
                        key={item.type}
                        type="button"
                        className="tma-builder-picker__item"
                        onClick={() => addBlockFromPicker(item.type)}
                        disabled={saving || readOnly}
                      >
                        <item.Icon size={20} className="tma-builder-picker__icon" />
                        <span className="tma-builder-picker__label">{item.label}</span>
                      </button>
                    ))}
                </div>
                <div className="tma-builder-picker__patterns">
                  <p className="tma-builder-picker__heading">Starter patterns</p>
                  {SECTION_PATTERNS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="tma-builder-picker__pattern"
                      onClick={() => {
                        applyLayoutFromSidebar([...currentLayout, ...p.build()])
                        setSidebarTab('sections')
                      }}
                      disabled={saving || readOnly}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {sidebarTab === 'edit' && selectedBlockData.block ? (() => {
              const blk = selectedBlockData.block as Record<string, unknown>
              const idx = selectedBlockData.index
              const patchBlock = (patch: Record<string, unknown>) => {
                applyLayoutFromSidebar(patchBlockAt(currentLayout, idx, patch))
              }
              const fieldClass = 'tma-builder-settings__input'
              return (
                <div className="tma-builder-edit">
                  <button type="button" className="tma-builder__edit-back" onClick={() => { setSelectedBlockId(null); setSidebarTab('sections') }}>
                    <ArrowLeft size={12} /> Back to sections
                  </button>
                  <p className="tma-builder__edit-heading">
                    {blockLabel(selectedBlockData.block, idx)}
                  </p>

                  <nav className="tma-builder__subtabs">
                    <button type="button" className={`tma-builder__subtab${editSubTab === 'content' ? ' tma-builder__subtab--active' : ''}`} onClick={() => setEditSubTab('content')}>
                      <Pencil size={12} /> Content
                    </button>
                    <button type="button" className={`tma-builder__subtab${editSubTab === 'style' ? ' tma-builder__subtab--active' : ''}`} onClick={() => setEditSubTab('style')}>
                      <Paintbrush size={12} /> Style
                    </button>
                    <button type="button" className={`tma-builder__subtab${editSubTab === 'advanced' ? ' tma-builder__subtab--active' : ''}`} onClick={() => setEditSubTab('advanced')}>
                      <SlidersHorizontal size={12} /> Advanced
                    </button>
                  </nav>

                  {editSubTab === 'content' ? (
                    <div className="tma-builder-edit__panel">
                      <LayoutBlockQuickFields
                        block={selectedBlockData.block}
                        index={idx}
                        layout={currentLayout}
                        applyLayout={applyLayoutFromSidebar}
                        disabled={saving || readOnly}
                      />
                    </div>
                  ) : null}

                  {editSubTab === 'style' ? (
                    <div className="tma-builder-edit__panel">
                      <div className="tma-builder-edit__section-label">Alignment</div>
                      <div className="tma-builder-edit__btn-group">
                        {([
                          { val: 'left', Icon: AlignLeft },
                          { val: 'center', Icon: AlignCenter },
                          { val: 'right', Icon: AlignRight },
                          { val: 'justify', Icon: AlignJustify },
                        ] as const).map(({ val, Icon }) => (
                          <button key={val} type="button" className={`tma-builder-edit__btn-opt${blk.textAlign === val ? ' tma-builder-edit__btn-opt--active' : ''}`} onClick={() => patchBlock({ textAlign: blk.textAlign === val ? undefined : val })} disabled={saving || readOnly} title={val}>
                            <Icon size={14} />
                          </button>
                        ))}
                      </div>

                      <div className="tma-builder-edit__section-label">Background</div>
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Color</span>
                        <div className="tma-builder-edit__color-input">
                          <input type="color" value={typeof blk.bgColor === 'string' && blk.bgColor ? blk.bgColor : '#000000'} onChange={(e) => patchBlock({ bgColor: e.target.value })} disabled={saving || readOnly} className="tma-builder-edit__color-swatch" />
                          <input className={fieldClass} value={typeof blk.bgColor === 'string' ? blk.bgColor : ''} onChange={(e) => patchBlock({ bgColor: e.target.value || undefined })} disabled={saving || readOnly} placeholder="transparent" />
                        </div>
                      </div>
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Image</span>
                        <input className={fieldClass} value={typeof blk.bgImageUrl === 'string' ? blk.bgImageUrl : ''} onChange={(e) => patchBlock({ bgImageUrl: e.target.value || undefined })} disabled={saving || readOnly} placeholder="/uploads/..." />
                      </div>

                      <div className="tma-builder-edit__section-label">Typography</div>
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Text color</span>
                        <div className="tma-builder-edit__color-input">
                          <input type="color" value={typeof blk.textColor === 'string' && blk.textColor ? blk.textColor : '#ffffff'} onChange={(e) => patchBlock({ textColor: e.target.value })} disabled={saving || readOnly} className="tma-builder-edit__color-swatch" />
                          <input className={fieldClass} value={typeof blk.textColor === 'string' ? blk.textColor : ''} onChange={(e) => patchBlock({ textColor: e.target.value || undefined })} disabled={saving || readOnly} placeholder="inherit" />
                        </div>
                      </div>

                      <div className="tma-builder-edit__section-label">Effects</div>
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Opacity</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <input type="range" min={0} max={100} step={5} value={typeof blk.opacity === 'number' ? blk.opacity : 100} onChange={(e) => { const v = Number(e.target.value); patchBlock({ opacity: v === 100 ? undefined : v }) }} disabled={saving || readOnly} style={{ flex: 1 }} />
                          <span className="tma-builder-edit__range-val">{typeof blk.opacity === 'number' ? blk.opacity : 100}%</span>
                        </div>
                      </div>
                      {typeof blk.opacity === 'number' && blk.opacity < 10 ? (
                        <div style={{ fontSize: '0.65rem', color: '#fde68a', padding: '0.15rem 0' }}>Block will be nearly invisible</div>
                      ) : null}
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Corners</span>
                        <select className={fieldClass} value={typeof blk.borderRadius === 'string' ? blk.borderRadius : 'none'} onChange={(e) => patchBlock({ borderRadius: e.target.value === 'none' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                          <option value="none">None</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                      <div className="tma-builder-edit__color-row">
                        <span className="tma-builder-edit__color-label">Theme</span>
                        <select className={fieldClass} value={typeof blk.sectionTheme === 'string' ? blk.sectionTheme : 'inherit'} onChange={(e) => patchBlock({ sectionTheme: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                          <option value="inherit">Inherit</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {editSubTab === 'advanced' ? (
                    <div className="tma-builder-edit__panel">
                      <details className="tma-builder-settings__group" open>
                        <summary className="tma-builder-settings__summary">Margin</summary>
                        <div className="tma-builder-settings__fields">
                          <div className="tma-builder-edit__box-model">
                            <div className="tma-builder-edit__box-row">
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.marginTop ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.marginUnit === 'string' ? blk.marginUnit : 'px'; patchBlock({ marginTop: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Top</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.marginRight ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.marginUnit === 'string' ? blk.marginUnit : 'px'; patchBlock({ marginRight: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Right</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.marginBottom ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.marginUnit === 'string' ? blk.marginUnit : 'px'; patchBlock({ marginBottom: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Bottom</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.marginLeft ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.marginUnit === 'string' ? blk.marginUnit : 'px'; patchBlock({ marginLeft: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Left</span>
                              </div>
                              <select className="tma-builder-edit__unit-select" value={typeof blk.marginUnit === 'string' ? blk.marginUnit : 'px'} onChange={(e) => {
                                const newUnit = e.target.value;
                                const reUnit = (val: unknown) => { if (typeof val !== 'string') return undefined; const n = parseFloat(val); return Number.isFinite(n) ? `${n}${newUnit}` : undefined; };
                                patchBlock({ marginUnit: newUnit, marginTop: reUnit(blk.marginTop), marginRight: reUnit(blk.marginRight), marginBottom: reUnit(blk.marginBottom), marginLeft: reUnit(blk.marginLeft) });
                              }} disabled={saving || readOnly}>
                                <option value="px">px</option>
                                <option value="%">%</option>
                                <option value="em">em</option>
                                <option value="rem">rem</option>
                                <option value="vw">vw</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </details>

                      <details className="tma-builder-settings__group" open>
                        <summary className="tma-builder-settings__summary">Padding</summary>
                        <div className="tma-builder-settings__fields">
                          <div className="tma-builder-edit__box-model">
                            <div className="tma-builder-edit__box-row">
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.paddingTop ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.paddingUnit === 'string' ? blk.paddingUnit : 'px'; patchBlock({ paddingTop: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Top</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.paddingRight ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.paddingUnit === 'string' ? blk.paddingUnit : 'px'; patchBlock({ paddingRight: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Right</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.paddingBottom ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.paddingUnit === 'string' ? blk.paddingUnit : 'px'; patchBlock({ paddingBottom: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Bottom</span>
                              </div>
                              <div className="tma-builder-edit__box-cell">
                                <input className="tma-builder-edit__box-input" type="number" value={parseInt(String(blk.paddingLeft ?? ''), 10) || ''} onChange={(e) => { const v = e.target.value; const u = typeof blk.paddingUnit === 'string' ? blk.paddingUnit : 'px'; patchBlock({ paddingLeft: v ? `${v}${u}` : undefined }) }} disabled={saving || readOnly} placeholder="–" />
                                <span className="tma-builder-edit__box-hint">Left</span>
                              </div>
                              <select className="tma-builder-edit__unit-select" value={typeof blk.paddingUnit === 'string' ? blk.paddingUnit : 'px'} onChange={(e) => {
                                const newUnit = e.target.value;
                                const reUnit = (val: unknown) => { if (typeof val !== 'string') return undefined; const n = parseFloat(val); return Number.isFinite(n) ? `${n}${newUnit}` : undefined; };
                                patchBlock({ paddingUnit: newUnit, paddingTop: reUnit(blk.paddingTop), paddingRight: reUnit(blk.paddingRight), paddingBottom: reUnit(blk.paddingBottom), paddingLeft: reUnit(blk.paddingLeft) });
                              }} disabled={saving || readOnly}>
                                <option value="px">px</option>
                                <option value="%">%</option>
                                <option value="em">em</option>
                                <option value="rem">rem</option>
                                <option value="vw">vw</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </details>

                      <details className="tma-builder-settings__group" open>
                        <summary className="tma-builder-settings__summary">Size</summary>
                        <div className="tma-builder-settings__fields">
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Width</span>
                            <select className={fieldClass} value={blk.widthMode === 'default' || blk.widthMode === 'narrow' || blk.widthMode === 'full' ? String(blk.widthMode) : 'inherit'} onChange={(e) => patchBlock({ widthMode: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                              <option value="inherit">Default</option>
                              <option value="narrow">Narrow</option>
                              <option value="full">Full width</option>
                            </select>
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Spacing</span>
                            <select className={fieldClass} value={blk.sectionSpacingY === 'none' || blk.sectionSpacingY === 'sm' || blk.sectionSpacingY === 'md' || blk.sectionSpacingY === 'lg' ? String(blk.sectionSpacingY) : 'inherit'} onChange={(e) => patchBlock({ sectionSpacingY: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                              <option value="inherit">Default</option>
                              <option value="none">None</option>
                              <option value="sm">Small</option>
                              <option value="md">Medium</option>
                              <option value="lg">Large</option>
                            </select>
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Z-index</span>
                            <input className={fieldClass} type="number" value={typeof blk.zIndex === 'number' ? blk.zIndex : ''} onChange={(e) => { const rawValue = e.target.value.trim(); if (!rawValue) { patchBlock({ zIndex: undefined }); return } const v = Number(rawValue); patchBlock({ zIndex: Number.isFinite(v) ? v : undefined }) }} disabled={saving || readOnly} placeholder="auto" style={{ flex: 1, width: 0 }} />
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Animation</span>
                            <select className={fieldClass} value={blk.animationPreset === 'none' || blk.animationPreset === 'fade' || blk.animationPreset === 'slide-up' || blk.animationPreset === 'slide-blur' || blk.animationPreset === 'scale-in' ? String(blk.animationPreset) : 'inherit'} onChange={(e) => patchBlock({ animationPreset: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                              <option value="inherit">Default</option>
                              <option value="none">None</option>
                              <option value="fade">Fade</option>
                              <option value="slide-up">Slide up</option>
                              <option value="slide-blur">Slide + blur</option>
                              <option value="scale-in">Scale in</option>
                            </select>
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Hover</span>
                            <select className={fieldClass} value={blk.hoverPreset === 'none' || blk.hoverPreset === 'lift' || blk.hoverPreset === 'scale' || blk.hoverPreset === 'glow' || blk.hoverPreset === 'border-highlight' ? String(blk.hoverPreset) : 'inherit'} onChange={(e) => patchBlock({ hoverPreset: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                              <option value="inherit">Default</option>
                              <option value="none">None</option>
                              <option value="lift">Lift</option>
                              <option value="scale">Scale</option>
                              <option value="glow">Glow</option>
                              <option value="border-highlight">Border highlight</option>
                            </select>
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Atmosphere</span>
                            <select className={fieldClass} value={blk.backgroundEffect === 'none' || blk.backgroundEffect === 'glow' || blk.backgroundEffect === 'glass' || blk.backgroundEffect === 'noise' || blk.backgroundEffect === 'orb' ? String(blk.backgroundEffect) : 'inherit'} onChange={(e) => patchBlock({ backgroundEffect: e.target.value === 'inherit' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                              <option value="inherit">Default</option>
                              <option value="none">None</option>
                              <option value="glow">Glow</option>
                              <option value="glass">Glass</option>
                              <option value="noise">Noise</option>
                              <option value="orb">Orb</option>
                            </select>
                          </div>
                          {blk.blockType === 'hero' || blk.blockType === 'promoBanner' || blk.blockType === 'imageBanner' ? (
                            <div className="tma-builder-edit__color-row">
                              <span className="tma-builder-edit__color-label">Hero effect</span>
                              <select className={fieldClass} value={blk.heroEffect === 'rotating-text' ? 'rotating-text' : 'none'} onChange={(e) => patchBlock({ heroEffect: e.target.value === 'none' ? undefined : e.target.value })} disabled={saving || readOnly} style={{ flex: 1 }}>
                                <option value="none">None</option>
                                <option value="rotating-text">Rotating text</option>
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </details>

                      <details className="tma-builder-settings__group">
                        <summary className="tma-builder-settings__summary">Responsive</summary>
                        <div className="tma-builder-settings__fields">
                          <label className="tma-builder-edit__check-row">
                            <input type="checkbox" checked={Boolean(blk.sectionHidden)} onChange={(e) => patchBlock({ sectionHidden: e.target.checked || undefined })} disabled={saving || readOnly} />
                            <span>Hide on public site</span>
                          </label>
                          <label className="tma-builder-edit__check-row">
                            <input type="checkbox" checked={Boolean(blk.hideOnDesktop)} onChange={(e) => patchBlock({ hideOnDesktop: e.target.checked || undefined })} disabled={saving || readOnly} />
                            <Monitor size={13} /> <span>Hide on desktop</span>
                          </label>
                          <label className="tma-builder-edit__check-row">
                            <input type="checkbox" checked={Boolean(blk.hideOnMobile)} onChange={(e) => patchBlock({ hideOnMobile: e.target.checked || undefined })} disabled={saving || readOnly} />
                            <Smartphone size={13} /> <span>Hide on mobile</span>
                          </label>
                        </div>
                      </details>

                      <details className="tma-builder-settings__group">
                        <summary className="tma-builder-settings__summary">Identification</summary>
                        <div className="tma-builder-settings__fields">
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">CSS ID</span>
                            <input className={fieldClass} value={typeof blk.anchorId === 'string' ? blk.anchorId : ''} onChange={(e) => patchBlock({ anchorId: e.target.value.trim() || undefined })} disabled={saving || readOnly} placeholder="e.g. pricing" autoComplete="off" style={{ flex: 1 }} />
                          </div>
                          <div className="tma-builder-edit__color-row">
                            <span className="tma-builder-edit__color-label">Classes</span>
                            <input className={fieldClass} value={typeof blk.customClass === 'string' ? blk.customClass : ''} onChange={(e) => patchBlock({ customClass: e.target.value.trim() || undefined })} disabled={saving || readOnly} placeholder="space-separated" autoComplete="off" style={{ flex: 1 }} />
                          </div>
                        </div>
                      </details>

                      <button
                        type="button"
                        className="tma-builder-edit__delete"
                        onClick={() => {
                          if (!window.confirm('Delete this section? You can undo with Ctrl+Z.')) return
                          applyLayoutFromSidebar(currentLayout.filter((_, i) => i !== idx))
                          setSelectedBlockId(null)
                          setSidebarTab('sections')
                        }}
                        disabled={saving || readOnly}
                      >
                        <Trash2 size={13} /> Delete section
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })() : null}

            {sidebarTab === 'edit' && !selectedBlockData.block ? (
              <div style={{ padding: '1rem 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--tma-white-muted)', fontSize: '0.8rem' }}>Click a section in the list or preview to edit it.</p>
                <button type="button" className="tma-builder__edit-back" onClick={() => setSidebarTab('sections')}>
                  ← Back to sections
                </button>
              </div>
            ) : null}

            {sidebarTab === 'settings' ? (
              <div className="tma-builder-settings">
                <details className="tma-builder-settings__group" open>
                  <summary className="tma-builder-settings__summary">Page basics</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      Slug
                      <input className="tma-builder-settings__input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={baseSettingsDisabled} autoComplete="off" />
                    </label>
                    <label className="tma-builder-settings__label">
                      Page type
                      <select className="tma-builder-settings__input" value={pageType} onChange={(e) => setPageType(e.target.value)} disabled={baseSettingsDisabled}>
                        {!PAGE_TYPES.some((p) => p.value === pageType) ? <option value={pageType}>Current: {pageType}</option> : null}
                        {PAGE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    {localeScopedReadOnly ? (
                      <p className="tma-console-hint" style={{ marginBottom: 0 }}>
                        Slug and page type stay on the German base page. Edit them from the German tab.
                      </p>
                    ) : null}
                  </div>
                </details>

                {/* Hero content is managed via Hero section blocks in the Sections tab */}

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">SEO</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      SEO title
                      <input className="tma-builder-settings__input" value={surface.seoTitle} onChange={(e) => updateSurface('seoTitle', e.target.value)} disabled={saving || readOnly} />
                    </label>
                    <label className="tma-builder-settings__label">
                      SEO description
                      <textarea className="tma-builder-settings__input" rows={2} value={surface.seoDescription} onChange={(e) => updateSurface('seoDescription', e.target.value)} disabled={saving || readOnly} />
                    </label>
                    <label className="tma-builder-settings__label">
                      Canonical URL
                      <input className="tma-builder-settings__input" value={surface.seoCanonicalUrl} onChange={(e) => updateSurface('seoCanonicalUrl', e.target.value)} placeholder="https://example.com/page" disabled={saving || readOnly} />
                    </label>
                    <label className="tma-builder-settings__label">
                      OG image URL
                      <input className="tma-builder-settings__input" value={surface.seoOgImageUrl} onChange={(e) => updateSurface('seoOgImageUrl', e.target.value)} placeholder="/uploads/cms/..." disabled={saving || readOnly} />
                    </label>
                  </div>
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Navigation</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      Nav label
                      <input className="tma-builder-settings__input" value={surface.navigationLabel} onChange={(e) => updateSurface('navigationLabel', e.target.value)} placeholder="Appears in site header" disabled={baseSettingsDisabled} />
                    </label>
                    <label className="tma-builder-settings__label">
                      Nav href
                      <input className="tma-builder-settings__input" value={surface.navigationHref} onChange={(e) => updateSurface('navigationHref', e.target.value)} placeholder="Leave blank for page path" disabled={baseSettingsDisabled} />
                    </label>
                    <label className="tma-builder-settings__label">
                      Sort order
                      <input className="tma-builder-settings__input" inputMode="numeric" value={surface.navOrder} onChange={(e) => updateSurface('navOrder', e.target.value)} placeholder="10, 20, 30…" disabled={baseSettingsDisabled} />
                    </label>
                    {localeScopedReadOnly ? (
                      <p className="tma-console-hint" style={{ marginBottom: 0 }}>
                        Navigation placement stays on the German base page. English editing here covers content and SEO.
                      </p>
                    ) : null}
                  </div>
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Appearance</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      Page theme
                      <select className="tma-builder-settings__input" value={surface.pageTheme} onChange={(e) => updateSurface('pageTheme', e.target.value)} disabled={saving || readOnly}>
                        <option value="inherit">Inherit</option>
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                      </select>
                    </label>
                    <label className="tma-builder-settings__label">
                      Content max width
                      <select className="tma-builder-settings__input" value={surface.maxWidthMode} onChange={(e) => updateSurface('maxWidthMode', e.target.value)} disabled={saving || readOnly}>
                        <option value="inherit">Inherit</option>
                        <option value="default">Default</option>
                        <option value="narrow">Narrow</option>
                        <option value="full">Full bleed</option>
                      </select>
                    </label>
                    <label className="tma-builder-settings__label">
                      Section spacing
                      <select className="tma-builder-settings__input" value={surface.sectionSpacingPreset} onChange={(e) => updateSurface('sectionSpacingPreset', e.target.value)} disabled={saving || readOnly}>
                        <option value="inherit">Inherit</option>
                        <option value="compact">Compact</option>
                        <option value="default">Default</option>
                        <option value="comfortable">Comfortable</option>
                        <option value="spacious">Spacious</option>
                      </select>
                    </label>
                    <label className="tma-builder-settings__label">
                      Header variant
                      <select className="tma-builder-settings__input" value={surface.headerVariant} onChange={(e) => updateSurface('headerVariant', e.target.value)} disabled={saving || readOnly}>
                        <option value="inherit">Inherit</option>
                        <option value="default">Default</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </label>
                    <label className="tma-builder-settings__label">
                      Footer variant
                      <select className="tma-builder-settings__input" value={surface.footerVariant} onChange={(e) => updateSurface('footerVariant', e.target.value)} disabled={saving || readOnly}>
                        <option value="inherit">Inherit</option>
                        <option value="default">Default</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </label>
                    {canEditCustomCss ? (
                      <label className="tma-builder-settings__label">
                        Custom CSS
                        <textarea className="tma-builder-settings__input" rows={4} value={surface.pageCustomCss} onChange={(e) => updateSurface('pageCustomCss', e.target.value)} disabled={saving || readOnly} spellCheck={false} placeholder="Scoped to this page only" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }} />
                      </label>
                    ) : null}
                  </div>
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Tracking</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      GTM ID
                      <input className="tma-builder-settings__input" value={surface.trackingGtm} onChange={(e) => updateSurface('trackingGtm', e.target.value)} placeholder="GTM-XXXXXXX" autoComplete="off" disabled={saving || readOnly} />
                    </label>
                    <label className="tma-builder-settings__label">
                      Meta Pixel ID
                      <input className="tma-builder-settings__input" value={surface.trackingMetaPixel} onChange={(e) => updateSurface('trackingMetaPixel', e.target.value)} autoComplete="off" disabled={saving || readOnly} />
                    </label>
                    <label className="tma-builder-settings__label">
                      LinkedIn partner ID
                      <input className="tma-builder-settings__input" value={surface.trackingLinkedIn} onChange={(e) => updateSurface('trackingLinkedIn', e.target.value)} autoComplete="off" disabled={saving || readOnly} />
                    </label>
                  </div>
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Translations</summary>
                  <ConsolePageTranslationsPanel pageId={pageId} canEdit={canEdit} disabled={saving || readOnly} />
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Templates &amp; snapshots</summary>
                  <div className="tma-builder-settings__fields">
                    <label className="tma-builder-settings__label">
                      Starter template
                      <select className="tma-builder-settings__input" value={templateId} onChange={(e) => setTemplateId(e.target.value as BuilderTemplateId | '')} disabled={saving || readOnly}>
                        <option value="">Choose…</option>
                        <option value="landing-fast">Landing fast</option>
                        <option value="service-authority">Service authority</option>
                        <option value="contact-convert">Contact conversion</option>
                        <option value="product-sales">Product sales</option>
                      </select>
                    </label>
                    <button type="button" className="tma-console-btn-secondary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={applyTemplate} disabled={saving || readOnly || !templateId}>Apply template</button>
                    <button type="button" className="tma-console-btn-secondary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={() => createRevision('Manual snapshot')} disabled={saving || readOnly}>Save snapshot</button>
                    {revisions.length > 0 ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        {revisions.map((rev) => (
                          <div key={rev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--tma-white-muted)', padding: '0.3rem 0', borderBottom: '1px solid var(--tma-border)' }}>
                            <span>{rev.label} — {new Date(rev.createdAt).toLocaleString()}</span>
                            <button type="button" className="tma-builder__icon-btn" onClick={() => restoreRevision(rev)} disabled={saving || readOnly} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>Restore</button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {storedRevisions.length > 0 ? (
                      <div style={{ marginTop: '0.85rem' }}>
                        {storedRevisions.map((rev) => (
                          <div key={rev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--tma-white-muted)', padding: '0.3rem 0', borderBottom: '1px solid var(--tma-border)' }}>
                            <span>
                              DB revision · {new Date(rev.createdAt).toLocaleString()}
                              {rev.actorEmail ? ` · ${rev.actorEmail}` : ''}
                              {rev.reason ? ` · ${rev.reason}` : ''}
                            </span>
                            <button type="button" className="tma-builder__icon-btn" onClick={() => void restoreStoredRevision(rev.id)} disabled={saving || readOnly} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>Restore DB</button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>

                <details className="tma-builder-settings__group">
                  <summary className="tma-builder-settings__summary">Developer JSON (advanced)</summary>
                  <p className="tma-console-block-fields-hint" style={{ marginTop: '0.75rem' }}>
                    Only use this if a developer asked you to edit the raw page document directly.
                  </p>
                  <textarea
                    className="tma-console-textarea-json"
                    style={{ minHeight: '10rem', fontSize: '0.72rem' }}
                    value={docText}
                    onChange={(e) => applyDocText(e.target.value, true)}
                    disabled={saving || readOnly}
                    spellCheck={false}
                  />
                </details>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="tma-builder__canvas">
          {previewSlot}
        </main>
      </div>
    </form>
  )
}
