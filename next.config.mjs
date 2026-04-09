import { dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants.js'

const projectRoot = dirname(fileURLToPath(import.meta.url))
function resolveDistDir(phase) {
  if (phase === PHASE_DEVELOPMENT_SERVER) return '.next-dev'
  // if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) return '.next-build'
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) return '.next'

  return '.next'
}

export default function nextConfig(phase) {
  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    distDir: resolveDistDir(phase),
    outputFileTracingRoot: projectRoot,
    turbopack: {
      root: projectRoot,
    },
    /** Avoid broken server vendor chunks for Drizzle (missing ./vendor-chunks/drizzle-orm.js). */
    serverExternalPackages: ['drizzle-orm', 'pg'],
    async redirects() {
      return [
        // Legacy /admin-style URLs → custom console (this app uses /console, not /admin)
        { source: '/admin', destination: '/console', permanent: false },
        { source: '/admin/:path*', destination: '/console', permanent: false },
      ]
    },
    async headers() {
      return [
        {
          source: '/((?!api|_next/static|_next/image|favicon.ico|brand|uploads).*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: blob: https: http:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com",
                "frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://player.vimeo.com",
                "media-src 'self' https: blob:",
                "object-src 'none'",
                "base-uri 'self'",
              ].join('; '),
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN',
            },
          ],
        },
      ]
    },
  }
}
