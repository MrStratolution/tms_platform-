#!/usr/bin/env node
/**
 * Smoke test: TMA_AI_* / OPENAI_* → OpenAI-compatible chat completions.
 * Usage: npm run smoke:ai
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(root, '.env') })
if (existsSync(join(root, '.env.local'))) {
  config({ path: join(root, '.env.local'), override: true })
}

const key = process.env.TMA_AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
const model =
  process.env.TMA_AI_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  'gpt-4o-mini'
const base = (process.env.TMA_AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(
  /\/$/,
  '',
)

if (!key) {
  console.error('Missing TMA_AI_API_KEY or OPENAI_API_KEY in .env or .env.local')
  process.exit(1)
}

const url = `${base}/chat/completions`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    max_tokens: 24,
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
  }),
})

const text = await res.text()
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, text.slice(0, 500))
  process.exit(1)
}

let j
try {
  j = JSON.parse(text)
} catch {
  console.error('Non-JSON response:', text.slice(0, 200))
  process.exit(1)
}

const content = j.choices?.[0]?.message?.content?.trim() ?? ''
console.log('OK — chat completions work')
console.log('Model:', model)
console.log('Reply:', JSON.stringify(content))
process.exit(0)
