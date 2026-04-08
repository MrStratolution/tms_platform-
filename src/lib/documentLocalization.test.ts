import { describe, expect, it } from 'vitest'

import {
  getDocumentForLocaleEditor,
  resolveLocalizedDocument,
  stripDocumentLocalizations,
  upsertDocumentLocale,
} from '@/lib/documentLocalization'

describe('resolveLocalizedDocument', () => {
  it('returns the base document when no overlay exists', () => {
    const source = { title: 'Hallo' }
    expect(resolveLocalizedDocument(source, 'en')).toEqual(source)
  })

  it('merges nested object fields for a locale overlay', () => {
    const source = {
      tagline: 'Deutsch',
      primaryCta: { label: 'Jetzt buchen', href: '/kontakt' },
      localizations: {
        en: {
          tagline: 'English',
          primaryCta: { label: 'Book now' },
        },
      },
    }

    expect(resolveLocalizedDocument(source, 'en')).toEqual({
      tagline: 'English',
      primaryCta: { label: 'Book now', href: '/kontakt' },
      localizations: source.localizations,
    })
  })

  it('replaces arrays instead of concatenating them', () => {
    const source = {
      fields: [{ label: 'Name' }, { label: 'Nachricht' }],
      localizations: {
        en: {
          fields: [{ label: 'Name' }, { label: 'Message' }],
        },
      },
    }

    expect(resolveLocalizedDocument(source, 'en')).toEqual({
      fields: [{ label: 'Name' }, { label: 'Message' }],
      localizations: source.localizations,
    })
  })

  it('falls back from en-gb to en overlay', () => {
    const source = {
      title: 'Deutsch',
      localizations: {
        en: {
          title: 'English',
        },
      },
    }

    expect(resolveLocalizedDocument(source, 'en-GB')).toEqual({
      title: 'English',
      localizations: source.localizations,
    })
  })

  it('returns an editable locale document without the localization container', () => {
    const source = {
      title: 'Deutsch',
      localizations: {
        en: {
          title: 'English',
        },
      },
    }

    expect(getDocumentForLocaleEditor(source, 'en')).toEqual({
      title: 'English',
    })
  })

  it('upserts a locale overlay without overwriting the base locale', () => {
    const source = {
      title: 'Deutsch',
      hero: { headline: 'Hallo' },
    }

    expect(
      upsertDocumentLocale(source, 'en', {
        title: 'English',
        hero: { headline: 'Hello' },
      }),
    ).toEqual({
      title: 'Deutsch',
      hero: { headline: 'Hallo' },
      localizations: {
        en: {
          title: 'English',
          hero: { headline: 'Hello' },
        },
      },
    })
  })

  it('strips localizations from an editable document', () => {
    expect(
      stripDocumentLocalizations({
        title: 'English',
        localizations: { en: { title: 'English' } },
      }),
    ).toEqual({ title: 'English' })
  })
})
