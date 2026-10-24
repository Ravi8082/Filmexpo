import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoContact } from '@/components/film-expo-contact'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Contact Us | Film Expo India',
  description: 'Get in touch with the Film Expo India team and register as an exhibitor, visitor, sponsor or film submitter.',
}

export default async function ContactPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('contactPage')) notFound()
  return <FilmExpoContact content={content} hiddenSections={hiddenSections} />
}
