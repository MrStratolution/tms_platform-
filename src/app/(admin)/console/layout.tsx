import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function ConsoleSegmentLayout(props: { children: ReactNode }) {
  const { children } = props
  return children
}
