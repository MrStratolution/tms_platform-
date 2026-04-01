/**
 * Shown on /console/login when JWT signing secret is missing or too short.
 */
export function ConsoleLoginEnvBanner() {
  const s = process.env.ADMIN_SESSION_SECRET
  if (s && s.length >= 32) return null

  return (
    <div className="tma-console-env-warning" role="alert">
      <strong>Server configuration.</strong> Set{' '}
      <code>ADMIN_SESSION_SECRET</code> to at least 32 characters in{' '}
      <code>.env</code>, then restart the dev server. Or run{' '}
      <code>npm run ensure-console-secret</code> (also runs as part of{' '}
      <code>npm run setup:local</code>).
    </div>
  )
}
