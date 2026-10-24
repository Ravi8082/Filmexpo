import type { Metadata } from 'next'
import { LegalPageView } from '@/components/legal-page-view'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Terms & Conditions | Film Expo India',
  description: 'Terms for using the Film Expo India website and event information.',
}

export default async function TermsPage() {
  const { content } = await getHomepageContent()
  return <LegalPageView eyebrow={content.legalPages.eyebrow} page={content.legalPages.terms} />
}
