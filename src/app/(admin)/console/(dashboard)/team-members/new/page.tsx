import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateTeamMemberForm } from '@/components/console/ConsoleCreateTeamMemberForm'

export const metadata: Metadata = { title: 'New team member' }

export default function ConsoleNewTeamMemberPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/team-members">← All team members</Link></p>
      <h1 className="tma-console-page-title">Create team member</h1>
      <ConsoleCreateTeamMemberForm />
    </main>
  )
}
