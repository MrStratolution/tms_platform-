import { describe, expect, it } from 'vitest'

import { applyRichTextShortcodes } from './richTextShortcodes'

describe('applyRichTextShortcodes', () => {
  it('replaces allowlisted site_name in Lexical JSON', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello {{site_name}}!', format: 0, style: '', mode: 'normal' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }
    const out = applyRichTextShortcodes(state as never, { site_name: 'TMA Platform' })
    const root = out.root as unknown as { children: { children: { text: string }[] }[] }
    const para = root.children[0]
    expect(para.children[0].text).toBe('Hello TMA Platform!')
  })

  it('leaves unknown tokens unchanged', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '{{evil}}', format: 0, style: '', mode: 'normal' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }
    const out = applyRichTextShortcodes(state as never, {})
    const root = out.root as unknown as { children: { children: { text: string }[] }[] }
    const para = root.children[0]
    expect(para.children[0].text).toBe('{{evil}}')
  })
})
