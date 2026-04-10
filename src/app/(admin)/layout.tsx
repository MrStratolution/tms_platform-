import '@/styles/tma-console.css'

import { Inter, Syne } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'TMA Console', template: '%s — TMA Console' },
  description: 'TMA platform — custom admin',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function AdminRootLayout(props: { children: ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className="tma-console-body">
        <div className="tma-console-shell">{children}</div>
      </body>
    </html>
  )
}
