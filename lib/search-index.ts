import type { HomepageContent } from './site-content'
import { speakerSlug } from './speakers'

export type SearchItem = {
  title: string
  kind: string
  url: string
  snippet: string
  haystack: string
}

function entry(title: string, kind: string, url: string, snippet: string, extra: string): SearchItem {
  const cleanSnippet = snippet.trim()
  return {
    title,
    kind,
    url,
    snippet: cleanSnippet.length > 120 ? `${cleanSnippet.slice(0, 117).trimEnd()}…` : cleanSnippet,
    haystack: `${title} ${kind} ${snippet} ${extra}`.toLowerCase(),
  }
}

export function buildSearchIndex(content: HomepageContent): SearchItem[] {
  const items: SearchItem[] = []

  for (const post of content.blogPage.posts) {
    items.push(entry(post.title, 'Blog', `/blog/${post.slug}`, post.excerpt, `${post.category} ${post.author} ${post.body}`))
  }

  for (const [index, speaker] of content.speakers.items.entries()) {
    items.push(entry(
      `${speaker.name} — ${speaker.role}`,
      'Speaker',
      `/speakers/${encodeURIComponent(speakerSlug(speaker, index))}`,
      [speaker.role, speaker.organization].filter(Boolean).join(' · '),
      `${speaker.bio ?? ''} ${speaker.session?.title ?? ''} ${speaker.organization}`,
    ))
  }

  for (const image of content.galleryPage.items) {
    items.push(entry(image.title, 'Gallery', '/gallery', image.description || image.category || '', `${image.category} ${image.era}`))
  }

  for (const news of content.news.items) {
    items.push(entry(news.title, 'News', news.href || '/#', news.category || '', news.title))
  }

  return items
}

export function runSearch(index: SearchItem[], query: string, limit = 30): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const terms = q.split(/\s+/)
  return index
    .map((item) => ({ item, score: terms.reduce((sum, term) => sum + (item.haystack.includes(term) ? 1 : 0), 0) }))
    .filter((result) => result.score === terms.length)
    .sort((a, b) => b.item.title.toLowerCase().indexOf(q) - a.item.title.toLowerCase().indexOf(q) || b.score - a.score)
    .slice(0, limit)
    .map((result) => result.item)
}
