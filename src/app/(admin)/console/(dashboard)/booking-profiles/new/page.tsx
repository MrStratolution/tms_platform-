import type { Metadata } from 'next'

import { ConsoleCreateBookingProfileForm } from '@/components/console/ConsoleCreateBookingProfileForm'

export const metadata: Metadata = {
  title: 'New booking profile',
}

export default function ConsoleNewBookingProfilePage() {
  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">New booking profile</h1>
      <ConsoleCreateBookingProfileForm />
    </main>
  )
}
