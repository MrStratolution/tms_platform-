/**
 * Seeds `tma_custom`: migration checkpoint + optional CMS demo (pages, forms, booking, templates).
 *
 * Usage: npm run seed
 */
import { config as loadEnv } from 'dotenv'
import { count } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'

import { getCustomDb, migrationCheckpoint } from '../src/db'

import { seedCmsDemo } from './seed-cms-demo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(projectRoot, '.env') })

const force = process.argv.includes('--force')

function printNextSteps() {
  const origin = (
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4069'
  ).replace(/\/$/, '')
  console.info(`
Next steps:
  • Console admin: npx tsx scripts/create-console-admin.ts you@company.com 'secure-password'
  • Open ${origin}/console/login
  • Public site: ${origin}/
`)
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and configure Postgres.')
    process.exit(1)
  }

  const db = getCustomDb()
  if (!db) {
    console.error('Could not open Drizzle client. Check DATABASE_URL.')
    process.exit(1)
  }

  const [row] = await db.select({ n: count() }).from(migrationCheckpoint)

  if (!row?.n) {
    await db.insert(migrationCheckpoint).values({ phase: 'custom-bootstrap' })
    console.info('Inserted `tma_custom.migration_checkpoint` (phase: custom-bootstrap).')
  } else if (force) {
    await db.insert(migrationCheckpoint).values({ phase: 'custom-bootstrap-reseed' })
    console.info('Appended migration checkpoint (--force).')
  } else {
    console.info(
      'Migration checkpoint already present; skipped insert. Use --force to append another row.',
    )
  }

  await seedCmsDemo()

  printNextSteps()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
