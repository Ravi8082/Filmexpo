import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoGallery } from '@/components/film-expo-gallery'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Gallery | Film Expo India',
  description: 'Past, present and upcoming moments from Film Expo India.',
}

export default async function GalleryPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('galleryPage')) notFound()
  return <FilmExpoGallery content={content} hiddenSections={hiddenSections} />
}
