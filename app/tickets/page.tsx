import type { Metadata } from 'next'
import { TicketsView } from '@/components/tickets-view'
import { getHomepageContent } from '@/lib/site-content'
import { isRazorpayEnabled } from '@/lib/razorpay'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Book a Pass | Film Expo India',
  description: 'Book visitor, delegate and student passes for Film Expo India 2027.',
}

export default async function TicketsPage() {
  const { content } = await getHomepageContent()
  return <TicketsView section={content.ticketing} enabled={isRazorpayEnabled()} brandName={content.brand.name} />
}
