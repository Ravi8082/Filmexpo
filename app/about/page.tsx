import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoAbout } from '@/components/film-expo-about'
import { EventStructuredData } from '@/components/structured-data'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'About Film Expo India',
  description: 'Discover the story, community and upcoming editions of Film Expo India.',
}

export default async function AboutPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('aboutPage')) notFound()
  return (
    <>
      <FilmExpoAbout content={content} hiddenSections={hiddenSections} />
      <EventStructuredData events={content.aboutPage.events.items} organizerName={content.brand.name} />
    </>
  )
}
