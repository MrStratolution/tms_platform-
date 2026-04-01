import { generateLocalizedBookingMetadata, renderLocalizedBooking } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props) {
  const { key } = await params
  return generateLocalizedBookingMetadata(key)
}

export default async function GermanBookingPage({ params }: Props) {
  const { key } = await params
  return renderLocalizedBooking(key)
}
