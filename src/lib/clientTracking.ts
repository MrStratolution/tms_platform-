/**
 * Fire-and-forget client event for `/api/tracking/event`.
 * Use from client components (CTA clicks, section views, etc.).
 */
export function trackClientEvent(
  eventType: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  void fetch('/api/tracking/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      path,
      metadata,
    }),
  }).catch(() => {
    /* ignore */
  })
}
