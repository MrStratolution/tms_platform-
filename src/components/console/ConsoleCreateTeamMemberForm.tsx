'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConsoleMediaIdField } from '@/components/console/ConsoleMediaIdField'
import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateTeamMemberForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [photoMediaId, setPhotoMediaId] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !role.trim()) { setError('Name and role are required.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/console/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          bio: bio.trim() || undefined,
          photoMediaId,
          sortOrder: Number.parseInt(sortOrder, 10) || 0,
        }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; teamMember?: { id: number } }>(res)
      if (!res.ok) { setError(data?.error ?? 'Create failed'); return }
      router.push(`/console/team-members/${data?.teamMember?.id}`)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">Name <input type="text" className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Role / title <input type="text" className="tma-console-input" value={role} onChange={(e) => setRole(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Bio (optional) <textarea className="tma-console-textarea-json" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} disabled={saving} /></label>
      <ConsoleMediaIdField
        label="Portrait image"
        value={photoMediaId}
        onChange={setPhotoMediaId}
        disabled={saving}
        helpText="Upload a portrait or choose one from the media library."
        folderSuggestion="team"
      />
      <label className="tma-console-label">Sort order <input type="number" className="tma-console-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving} /></label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></div>
    </form>
  )
}
