import type { MetadataRoute } from 'next'
import { getHomepageContent, type ContentSectionKey } from '@/lib/site-content'
import { speakerSlug } from '@/lib/speakers'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://filmexpoindia.com').replace(/\/+$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { content, hiddenSections } = await getHomepageContent()
  const pages: Array<{ path: string; key: ContentSectionKey | null; priority: number }> = [
    { path: '/', key: null, priority: 1 },
    { path: '/about', key: 'aboutPage', priority: 0.8 },
    { path: '/exhibitors', key: 'exhibitReasons', priority: 0.8 },
    { path: '/conferences', key: 'conferenceProgramme', priority: 0.8 },
    { path: '/speakers', key: 'speakers', priority: 0.8 },
    { path: '/gallery', key: 'galleryPage', priority: 0.7 },
    { path: '/tickets', key: 'ticketing', priority: 0.9 },
    { path: '/blog', key: 'blogPage', priority: 0.7 },
    { path: '/contact', key: 'contactPage', priority: 0.6 },
    { path: '/privacy', key: null, priority: 0.3 },
    { path: '/terms', key: null, priority: 0.3 },
    { path: '/refund', key: null, priority: 0.3 },
  ]
  const visiblePages = pages.filter((page) => !page.key || !hiddenSections.includes(page.key))
  const blogPosts = hiddenSections.includes('blogPage') ? [] : content.blogPage.posts.map((post) => ({
    url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))
  const speakerProfiles = hiddenSections.includes('speakers') ? [] : content.speakers.items.map((speaker, index) => ({
    url: `${siteUrl}/speakers/${encodeURIComponent(speakerSlug(speaker, index))}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    ...visiblePages.map((page) => ({
      url: `${siteUrl}${page.path}`,
      changeFrequency: page.path === '/' ? 'weekly' as const : 'monthly' as const,
      priority: page.priority,
    })),
    ...speakerProfiles,
    ...blogPosts,
  ]
}
