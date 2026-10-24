import type { Metadata } from 'next'
import { SearchPage } from '@/components/search-page'
import { buildSearchIndex } from '@/lib/search-index'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Search | Film Expo India',
  description: 'Search stories, speakers, galleries and news across Film Expo India.',
  robots: { index: false },
}

export default async function SearchLandingPage() {
  const { content } = await getHomepageContent()
  const index = buildSearchIndex(content)
  return <SearchPage index={index} total={index.length} />
}
