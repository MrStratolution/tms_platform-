export type EmailLanguage = 'de' | 'en'

export type EmailVariables = Record<
  string,
  string | number | boolean | null | undefined
>

export function normalizeEmailLanguage(value: string | null | undefined): EmailLanguage {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'de'
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function valueToString(value: EmailVariables[string]): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function interpolatePlainTemplate(
  template: string,
  vars: EmailVariables,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    valueToString(vars[key]),
  )
}

export function interpolateHtmlTemplate(
  template: string,
  vars: EmailVariables,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    escapeHtml(valueToString(vars[key])),
  )
}

export function sanitizeEmailSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}
