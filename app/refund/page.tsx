import type { Metadata } from 'next'
import { LegalPageView } from '@/components/legal-page-view'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Film Expo India',
  description: 'Refund and cancellation terms for Film Expo India registrations, exhibitor bookings and sponsorships.',
}

export default async function RefundPolicyPage() {
  const { content } = await getHomepageContent()
  return <LegalPageView eyebrow={content.legalPages.eyebrow} page={content.legalPages.refund} />
}
