import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SpeakersPage } from '@/components/speakers-page'
import { SpeakersStructuredData } from '@/components/structured-data'
import { speakerSlug } from '@/lib/speakers'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Speakers | Film Expo India',
  description: 'Meet the filmmakers, producers, technologists and creative leaders speaking at Film Expo India.',
}

export default async function SpeakersLandingPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('speakers')) notFound()
  const speakers = content.speakers.items.map((speaker, index) => ({ ...speaker, slug: speakerSlug(speaker, index) }))
  return (
    <>
      <SpeakersPage content={content} page={content.speakersPage} />
      <SpeakersStructuredData speakers={speakers} name={content.brand.name} />
    </>
  )
}
