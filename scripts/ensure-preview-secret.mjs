/**
 * Ensures `.env` has INTERNAL_PREVIEW_SECRET for /preview/[slug] and the in-console responsive preview.
 *
 * Usage: npm run ensure-preview-secret
 */
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

if (!existsSync(envPath)) {
  console.error('No .env — run npm run ensure-env first.')
  process.exit(1)
}

let content = readFileSync(envPath, 'utf8')
const newSecret = randomBytes(32).toString('base64url')
const lineRe = /^INTERNAL_PREVIEW_SECRET=(.*)$/m

function valueMissing(raw) {
  const v = (raw ?? '').replace(/\r$/, '').trim()
  return v.length < 8
}

const m = content.match(lineRe)
if (!m) {
  const suffix = content.endsWith('\n') ? '' : '\n'
  writeFileSync(
    envPath,
    `${content}${suffix}INTERNAL_PREVIEW_SECRET=${newSecret}\n`,
    'utf8',
  )
  console.log('Added INTERNAL_PREVIEW_SECRET to .env (draft preview + console responsive preview).')
  console.log('Restart `npm run dev` if it is already running.')
} else if (valueMissing(m[1])) {
  writeFileSync(envPath, content.replace(lineRe, `INTERNAL_PREVIEW_SECRET=${newSecret}`), 'utf8')
  console.log('Updated INTERNAL_PREVIEW_SECRET (was empty or too short).')
  console.log('Restart `npm run dev` if it is already running.')
} else {
  console.log('INTERNAL_PREVIEW_SECRET already set.')
}
