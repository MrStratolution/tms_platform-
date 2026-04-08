import type { ElementType, ReactNode } from 'react'

type Props = {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function GlassCard({ as: Tag = 'div', className, children }: Props) {
  return <Tag className={`tma-glass-card${className ? ` ${className}` : ''}`}>{children}</Tag>
}
