/**
 * Structured logs for leads, webhooks, sync, and email (search in log drain).
 */
export function logEvent(payload: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload })
  console.info(line)
}
