/**
 * If `.env` is missing, copy from `.env.example` so local commands work.
 */
import { copyFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
const examplePath = join(root, '.env.example')

if (existsSync(envPath)) {
  process.exit(0)
}

if (!existsSync(examplePath)) {
  console.error('Missing .env and .env.example — create .env manually.')
  process.exit(1)
}

copyFileSync(examplePath, envPath)
console.log(
  'Created .env from .env.example — review DATABASE_URL. Run npm run ensure-console-secret and npm run ensure-preview-secret.',
)
