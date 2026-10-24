import type { Metadata } from 'next'
import { LegalPageView } from '@/components/legal-page-view'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Privacy Policy | Film Expo India',
  description: 'How Film Expo India collects, uses and protects information submitted through this website.',
}

export default async function PrivacyPage() {
  const { content } = await getHomepageContent()
  return <LegalPageView eyebrow={content.legalPages.eyebrow} page={content.legalPages.privacy} />
}
