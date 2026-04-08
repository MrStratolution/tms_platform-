/**
 * Idempotently create or update a console admin user for local/E2E use.
 *
 * Usage:
 *   npx tsx scripts/ensure-console-admin.ts <email> <password>
 */
import { config as loadEnv } from 'dotenv'
import { eq } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'

import { getCustomDb } from '../src/db/client'
import { adminUsers } from '../src/db/schema'
import { hashPassword } from '../src/lib/console/password'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(projectRoot, '.env') })

async function main() {
  const emailArg = process.argv[2]
  const passwordArg = process.argv[3]
  if (!emailArg || !passwordArg) {
    console.error(
      'Usage: npx tsx scripts/ensure-console-admin.ts <email> <password>',
    )
    process.exit(1)
  }

  const db = getCustomDb()
  if (!db) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const email = emailArg.trim().toLowerCase()
  const passwordHash = await hashPassword(passwordArg)
  const localPart = email.split('@')[0] ?? 'Admin'
  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(adminUsers)
      .set({
        passwordHash,
        displayName: localPart,
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing[0]!.id))

    console.info(`Console user updated: ${email}`)
    return
  }

  await db.insert(adminUsers).values({
    email,
    passwordHash,
    displayName: localPart,
    role: 'admin',
  })

  console.info(`Console user created: ${email}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
