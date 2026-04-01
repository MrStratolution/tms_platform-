import type { BookingProfile } from '@/types/cms'

import type { CmsDb } from './cmsData'
import { getBookingProfileByPublicKey as load } from './cmsData'

export async function getBookingProfileByPublicKey(
  db: CmsDb,
  key: string,
): Promise<BookingProfile | null> {
  return load(db, key)
}

/** Path segment for /book/... for internal profiles. */
export function internalBookPath(profile: BookingProfile): string {
  if (profile.internalSlug && String(profile.internalSlug).trim() !== '') {
    return String(profile.internalSlug).trim()
  }
  return String(profile.id)
}
