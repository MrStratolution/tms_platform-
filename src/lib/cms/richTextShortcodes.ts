import type { SerializedEditorState } from 'lexical'

const ALLOWLIST: Record<string, (vars: Record<string, string>) => string> = {
  site_name: (vars) => vars.site_name ?? '',
  contact_email: (vars) => vars.contact_email ?? '',
  contact_phone: (vars) => vars.contact_phone ?? '',
  site_url: (vars) => vars.site_url ?? '',
  company_name: (vars) => vars.company_name ?? '',
}

/**
 * Replace allowlisted `{{token}}` placeholders in Lexical JSON text nodes (read-only safe).
 */
export function applyRichTextShortcodes(
  state: SerializedEditorState,
  vars: Record<string, string>,
): SerializedEditorState {
  const clone = JSON.parse(JSON.stringify(state)) as SerializedEditorState
  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.text === 'string') {
      o.text = replaceInString(o.text, vars)
    }
    const ch = o.children
    if (Array.isArray(ch)) {
      for (const c of ch) walk(c)
    }
  }
  walk(clone.root)
  return clone
}

function replaceInString(s: string, vars: Record<string, string>): string {
  return s.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, key: string) => {
    const fn = ALLOWLIST[key.toLowerCase()]
    return fn ? fn(vars) : _m
  })
}
