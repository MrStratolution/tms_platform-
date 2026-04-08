import { generateLocalizedBookingMetadata, renderLocalizedBooking } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props) {
  const { key } = await params
  return generateLocalizedBookingMetadata('en', key)
}

export default async function EnglishBookingPage({ params }: Props) {
  const { key } = await params
  return renderLocalizedBooking('en', key)
}
