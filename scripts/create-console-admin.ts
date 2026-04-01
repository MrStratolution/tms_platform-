/**
 * Create a user for the custom admin at /console (table tma_custom.admin_user).
 * Requires DATABASE_URL, applied Drizzle migrations, and bcrypt-compatible Postgres.
 *
 * Usage:
 *   npx tsx scripts/create-console-admin.ts <email> <password>
 */
import { config as loadEnv } from 'dotenv'
import { eq } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminUsers } from '../src/db/schema'
import { getCustomDb } from '../src/db/client'
import { hashPassword } from '../src/lib/console/password'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(projectRoot, '.env') })

async function main() {
  const emailArg = process.argv[2]
  const passwordArg = process.argv[3]
  if (!emailArg || !passwordArg) {
    console.error(
      'Usage: npx tsx scripts/create-console-admin.ts <email> <password>',
    )
    process.exit(1)
  }

  const db = getCustomDb()
  if (!db) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const email = emailArg.trim().toLowerCase()
  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)
  if (existing.length > 0) {
    console.error(`A console user already exists for ${email}`)
    process.exit(1)
  }

  const passwordHash = await hashPassword(passwordArg)
  const localPart = email.split('@')[0] ?? 'Admin'

  await db.insert(adminUsers).values({
    email,
    passwordHash,
    displayName: localPart,
    role: 'admin',
  })

  console.info(`Console user created: ${email}`)
  console.info('Set ADMIN_SESSION_SECRET (≥32 chars) in .env, then open /console/login')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
