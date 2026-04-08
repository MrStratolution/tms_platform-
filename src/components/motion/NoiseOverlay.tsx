type Props = {
  className?: string
  strength?: 'soft' | 'medium'
}

export function NoiseOverlay({ className, strength = 'soft' }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`tma-noise-overlay tma-noise-overlay--${strength}${className ? ` ${className}` : ''}`}
    />
  )
}
