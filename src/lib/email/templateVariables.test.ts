import { describe, expect, it } from 'vitest'

import {
  interpolateHtmlTemplate,
  interpolatePlainTemplate,
  normalizeEmailLanguage,
  sanitizeEmailSubject,
} from './templateVariables'

describe('normalizeEmailLanguage', () => {
  it('defaults to German and accepts English variants', () => {
    expect(normalizeEmailLanguage(undefined)).toBe('de')
    expect(normalizeEmailLanguage('de')).toBe('de')
    expect(normalizeEmailLanguage('en')).toBe('en')
    expect(normalizeEmailLanguage('en-GB')).toBe('en')
  })
})

describe('template interpolation', () => {
  it('escapes HTML values for email bodies', () => {
    expect(
      interpolateHtmlTemplate('<p>{{name}}</p>', { name: '<Admin>' }),
    ).toBe('<p>&lt;Admin&gt;</p>')
  })

  it('keeps plain text interpolation readable for subjects', () => {
    expect(
      interpolatePlainTemplate('Lead from {{name}}', { name: 'Alex Meyer' }),
    ).toBe('Lead from Alex Meyer')
  })
})

describe('sanitizeEmailSubject', () => {
  it('removes line breaks from subject values', () => {
    expect(sanitizeEmailSubject('Hello\r\nWorld')).toBe('Hello World')
  })
})
