'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { normalizePublicLocale, stripLocalePrefix, withLocalePrefix } from '@/lib/publicLocale'

const BASE_OPTIONS = ['de', 'en'] as const
const PAGE_LEVEL_PATH_PREFIXES = new Set(['products', 'work', 'preview', 'book'])

function shouldHideLanguageSwitcher(pathname: string | null): boolean {
  if (!pathname) return false
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname)
  return pathnameWithoutLocale.startsWith('/preview')
}

function pageSlugForLocaleAvailability(pathname: string | null): string | null {
  if (!pathname) return null
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname)
  if (pathnameWithoutLocale === '/') return 'home'
  const segments = pathnameWithoutLocale.split('/').filter(Boolean)
  if (segments[0] === 'work' && segments.length > 1) return '__work-detail__'
  if (segments.length !== 1) return null
  return PAGE_LEVEL_PATH_PREFIXES.has(segments[0]) ? null : segments[0]
}

export function PublicLanguageSwitcher(props: {
  label: string
  currentLocale: string
}) {
  const { label, currentLocale } = props
  const normalizedCurrentLocale = normalizePublicLocale(currentLocale)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hide = useMemo(() => shouldHideLanguageSwitcher(pathname), [pathname])
  const [options, setOptions] = useState<readonly string[]>(BASE_OPTIONS)

  useEffect(() => {
    const slug = pageSlugForLocaleAvailability(pathname)
    if (!slug) {
      setOptions(BASE_OPTIONS)
      return
    }
    if (slug === '__work-detail__') {
      setOptions([normalizedCurrentLocale])
      return
    }
    const pageSlug = slug

    let cancelled = false

    async function loadLocaleAvailability() {
      try {
        const res = await fetch(`/api/public/page-locales?slug=${encodeURIComponent(pageSlug)}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { readyLocales?: string[]; baseLocale?: string }
        const ready = Array.isArray(data.readyLocales) ? data.readyLocales.map(normalizePublicLocale) : []
        const base = normalizePublicLocale(data.baseLocale)
        const next = Array.from(new Set([base, ...ready, normalizedCurrentLocale]))
        if (!cancelled && next.length > 0) {
          setOptions(next)
        }
      } catch {
        if (!cancelled) {
          setOptions(BASE_OPTIONS)
        }
      }
    }

    void loadLocaleAvailability()

    return () => {
      cancelled = true
    }
  }, [pathname, normalizedCurrentLocale])

  const onChange = (next: string) => {
    const normalizedNext = normalizePublicLocale(next)
    if (normalizedNext === normalizedCurrentLocale) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('lang')
    const qs = params.toString()
    document.cookie = `tma_lang=${normalizedNext}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`
    const urlPath = withLocalePrefix(pathname ?? '/', normalizedNext)
    const url = qs ? `${urlPath}?${qs}` : urlPath
    window.location.assign(url)
  }

  if (hide) {
    return null
  }

  if (options.length <= 1) {
    return null
  }

  return (
    <div className="tma-lang-switcher">
      <label className="tma-lang-switcher__label">
        <select
          className="tma-lang-switcher__select"
          value={normalizedCurrentLocale}
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
    </div>
  )
}
