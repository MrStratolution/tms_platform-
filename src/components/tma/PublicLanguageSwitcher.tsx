'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { normalizePublicLocale, stripLocalePrefix, withLocalePrefix } from '@/lib/publicLocale'
import { readResponseJson } from '@/lib/safeJson'

function slugFromPathname(pathname: string | null): string | null {
  if (!pathname) return null
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname)
  if (pathnameWithoutLocale === '/' || pathnameWithoutLocale === '') return 'home'
  const first = pathnameWithoutLocale.split('/').filter(Boolean)[0]
  if (!first) return 'home'
  if (first === 'preview' || first === 'book' || first === 'products') return null
  return first
}

type LocalesPayload = {
  ok?: boolean
  baseLocale?: string
  readyLocales?: string[]
  error?: string
}

export function PublicLanguageSwitcher(props: {
  label: string
  currentLocale: string
}) {
  const { label, currentLocale } = props
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const slug = useMemo(() => slugFromPathname(pathname), [pathname])

  const [readyLocales, setReadyLocales] = useState<string[]>([])
  const [baseLocale, setBaseLocale] = useState<string>('de')
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!slug) {
      setReadyLocales([])
      return
    }
    try {
      const res = await fetch(
        `/api/public/page-locales?slug=${encodeURIComponent(slug)}`,
        { credentials: 'same-origin' },
      )
      const data = await readResponseJson<LocalesPayload>(res)
      if (!res.ok) {
        setErr(null)
        setBaseLocale('de')
        setReadyLocales([])
        return
      }
      setErr(null)
      setBaseLocale(normalizePublicLocale(data?.baseLocale))
      setReadyLocales(data?.readyLocales ?? [])
    } catch {
      setErr(null)
      setBaseLocale('de')
      setReadyLocales([])
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  const options = useMemo(() => {
    const set = new Set<string>()
    set.add(baseLocale)
    for (const l of readyLocales) set.add(l)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseLocale, readyLocales])

  const onChange = (next: string) => {
    if (next === currentLocale) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('lang')
    const qs = params.toString()
    const urlPath = withLocalePrefix(pathname ?? '/', normalizePublicLocale(next))
    const url = qs ? `${urlPath}?${qs}` : urlPath
    window.location.assign(url)
  }

  if (!slug || options.length <= 1) {
    return null
  }

  return (
    <div className="tma-lang-switcher">
      <label className="tma-lang-switcher__label">
        <span className="tma-lang-switcher__text">{label}</span>
        <select
          className="tma-lang-switcher__select"
          value={currentLocale}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        >
          {options.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      {err ? <span className="tma-lang-switcher__err">{err}</span> : null}
    </div>
  )
}
