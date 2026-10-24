import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoExhibitors } from '@/components/film-expo-exhibitors'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Exhibitors | Film Expo India',
  description: 'Showcase your business, connect with industry professionals, and grow with Film Expo India.',
}

export default async function ExhibitorsPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('exhibitReasons')) notFound()
  return <FilmExpoExhibitors content={content} hiddenSections={hiddenSections} />
}
