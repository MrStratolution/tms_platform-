'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ConsoleLogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onLogout() {
    setPending(true)
    try {
      await fetch('/api/console-auth/logout', { method: 'POST' })
      router.replace('/console/login')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      className="tma-console-logout"
      type="button"
      onClick={() => void onLogout()}
      disabled={pending}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
