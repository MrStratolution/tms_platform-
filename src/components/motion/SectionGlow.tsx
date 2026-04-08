type Props = {
  className?: string
  tone?: 'lime' | 'soft'
}

export function SectionGlow({ className, tone = 'lime' }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`tma-section-glow tma-section-glow--${tone}${className ? ` ${className}` : ''}`}
    />
  )
}
