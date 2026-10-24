import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoBlog } from '@/components/film-expo-blog'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Blog | Film Expo India',
  description: 'News, ideas and expert perspectives on the business, technology and creativity shaping the film industry.',
}

export default async function BlogPage() {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('blogPage')) notFound()
  return <FilmExpoBlog content={content} hiddenSections={hiddenSections} />
}
