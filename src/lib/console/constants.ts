/** HttpOnly cookie for custom admin (`/console`). */
export const CONSOLE_SESSION_COOKIE = 'tma_console_session'

export const CONSOLE_JWT_ISSUER = 'tma-console'

/** HS256 signing secret — set `ADMIN_SESSION_SECRET` (≥32 chars). */
export const CONSOLE_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7
