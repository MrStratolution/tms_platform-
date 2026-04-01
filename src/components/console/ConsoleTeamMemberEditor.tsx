'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    name: string
    role: string
    bio: string | null
    photoMediaId: number | null
    sortOrder: number
    linkedinUrl: string | null
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleTeamMemberEditor({ id, initial, canEdit }: Props) {
  const [name, setName] = useState(initial.name)
  const [role, setRole] = useState(initial.role)
  const [bio, setBio] = useState(initial.bio ?? '')
  const [photoMediaId, setPhotoMediaId] = useState(initial.photoMediaId != null ? String(initial.photoMediaId) : '')
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder))
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl ?? '')
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const pid = photoMediaId.trim()
    const body: Record<string, unknown> = {
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim() || null,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      linkedinUrl: linkedinUrl.trim() || null,
      active,
    }
    if (pid === '') body.photoMediaId = null
    else {
      const n = Number.parseInt(pid, 10)
      if (!Number.isFinite(n) || n < 1) { setError('Photo media id must be a positive integer or empty.'); return }
      body.photoMediaId = n
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/team-members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; teamMember?: { updatedAt: string } }>(res)
      if (!res.ok) { setError(data?.error ?? 'Save failed'); return }
      setSuccess(`Saved at ${new Date(data?.teamMember?.updatedAt ?? Date.now()).toLocaleString()}`)
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const dis = saving || !canEdit

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {!canEdit ? <p className="tma-console-env-warning" role="status"><strong>View only.</strong> Your role cannot edit content.</p> : null}
      <label className="tma-console-label">Name <input type="text" className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Role / title <input type="text" className="tma-console-input" value={role} onChange={(e) => setRole(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Bio (optional) <textarea className="tma-console-textarea-json" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Photo media id (optional, <code>cms_media.id</code>) <input type="text" className="tma-console-input" value={photoMediaId} onChange={(e) => setPhotoMediaId(e.target.value)} disabled={dis} placeholder="e.g. 1" /></label>
      <label className="tma-console-label">Sort order <input type="number" className="tma-console-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">LinkedIn URL (optional) <input type="text" className="tma-console-input" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={dis} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div> : null}
    </form>
  )
}
