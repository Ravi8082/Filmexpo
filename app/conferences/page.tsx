import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoConferences } from '@/components/film-expo-conferences'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Conference Programme | Film Expo India',
  description: 'Explore conference tracks, speakers and sessions at Film Expo India.',
}

export default async function ConferencesPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('conferenceProgramme')) notFound()
  return <FilmExpoConferences content={content} hiddenSections={hiddenSections} />
}
