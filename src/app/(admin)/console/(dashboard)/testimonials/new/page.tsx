import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateTestimonialForm } from '@/components/console/ConsoleCreateTestimonialForm'

export const metadata: Metadata = {
  title: 'New testimonial',
}

export default function ConsoleNewTestimonialPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/testimonials">← All testimonials</Link>
      </p>
      <h1 className="tma-console-page-title">Create testimonial</h1>
      <ConsoleCreateTestimonialForm />
    </main>
  )
}
