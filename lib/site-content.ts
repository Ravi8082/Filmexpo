import { unstable_cache } from 'next/cache'
import type { RowDataPacket } from 'mysql2'
import defaultContent from './homepage-default.json'
import importedMedia from './filmexpo-live-media.json'
import { getPool } from './mysql'

export type HomepageContent = typeof defaultContent
export type ContentSectionKey = keyof HomepageContent
export type HomepageData = {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}
export const homepageContentDefaults: HomepageContent = defaultContent

function applyImportedMedia(content: HomepageContent): HomepageContent {
  const next = structuredClone(content)
  const isIllustration = (image: string) => image.startsWith('/film-expo-art/')
  const applyMentorPortrait = (profile: HomepageContent['homeAbout']['profile']) => {
    if (profile.image !== '/film-expo-art/speaker-1.svg') return

    profile.image = importedMedia.mentor.image
    if (profile.name === 'Featured Mentor') profile.name = importedMedia.mentor.name
    if (profile.role === 'Film Industry Mentor' || profile.role === 'Industry guest · illustrative profile') {
      profile.role = importedMedia.mentor.role
    }
  }

  if (next.hero.image && isIllustration(next.hero.image)) {
    next.hero.image = importedMedia.hero.image
  }
  applyMentorPortrait(next.homeAbout.profile)
  applyMentorPortrait(next.aboutPage.story.profile)
  if (next.homeAbout.image && isIllustration(next.homeAbout.image)) {
    next.homeAbout.image = importedMedia.gallery[0]?.image ?? importedMedia.hero.image
  }
  const featurePhotos: Record<string, number> = {
    exhibit: 129,
    visit: 69,
    'film-submission': 79,
    sponsorship: 0,
    conference: 99,
  }
  if (next.features.items.length > 0 && next.features.items.every((item) => isIllustration(item.image))) {
    next.features.items = next.features.items.map((item) => ({
      ...item,
      image: importedMedia.gallery[featurePhotos[item.id]]?.image ?? item.image,
    }))
  }
  if (next.closing.image && isIllustration(next.closing.image)) {
    next.closing.image = importedMedia.gallery[1]?.image ?? importedMedia.hero.image
  }
  if (next.partners.items.length > 0 && next.partners.items.every((item) => item.logo.startsWith('/film-expo-art/partner-'))) {
    next.partners.items = importedMedia.partners.map((partner) => ({
      name: partner.name,
      logo: partner.image,
    }))
  }
  if (next.gallery.items.length > 0 && next.gallery.items.every((item) => isIllustration(item.image))) {
    next.gallery.items = importedMedia.gallery.slice(0, 5).map((item) => ({
      alt: item.title,
      image: item.image,
    }))
  }
  if (next.galleryPage.hero.image && isIllustration(next.galleryPage.hero.image)) {
    next.galleryPage.hero.image = importedMedia.hero.image
  }
  if (next.galleryPage.items.length > 0 && next.galleryPage.items.every((item) => isIllustration(item.image))) {
    next.galleryPage.items = importedMedia.gallery
  }

  return next
}

export function mergeContentDefaults<T>(defaults: T, saved: unknown): T {
  if (Array.isArray(defaults)) {
    if (!Array.isArray(saved)) return defaults
    return saved.map((item, index) => index < defaults.length
      ? mergeContentDefaults(defaults[index], item)
      : item) as T
  }

  if (defaults && typeof defaults === 'object') {
    const savedObject = saved && typeof saved === 'object' && !Array.isArray(saved)
      ? saved as Record<string, unknown>
      : {}
    const merged: Record<string, unknown> = { ...defaults, ...savedObject }
    for (const [key, value] of Object.entries(defaults)) {
      if (Object.hasOwn(savedObject, key)) {
        merged[key] = mergeContentDefaults(value, savedObject[key])
      }
    }
    return merged as T
  }

  return (saved === undefined ? defaults : saved) as T
}

const HREF_KEYS = new Set(['href', 'buttonHref', 'downloadHref', 'brochureHref', 'privacyHref', 'termsHref', 'sitemapHref'])

function sanitizeHashLinks(value: unknown): unknown {
  if (Array.isArray(value)) {
    value.forEach(sanitizeHashLinks)
    return value
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (HREF_KEYS.has(key) && typeof val === 'string' && (val.startsWith('#') || val.startsWith('/#'))) {
        (value as Record<string, unknown>)[key] = ''
      } else {
        sanitizeHashLinks(val)
      }
    }
    return value
  }
  return value
}

const getCachedContent = unstable_cache(
  async () => {
    const [rows] = await getPool().query<Array<RowDataPacket & {
      section_key: string
      content_json: unknown
      is_visible: number
    }>>(
      'SELECT section_key, content_json, is_visible FROM site_sections ORDER BY sort_order',
    )
    const content = structuredClone(homepageContentDefaults) as Record<string, unknown>
    const hiddenSections: ContentSectionKey[] = []

    for (const row of rows) {
      if (!Object.hasOwn(content, row.section_key)) continue
      const section = typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
      if (section && typeof section === 'object' && !Array.isArray(section)) {
        content[row.section_key] = mergeContentDefaults(content[row.section_key], section)
      }
      if (!row.is_visible) hiddenSections.push(row.section_key as ContentSectionKey)
    }

    return { content: applyImportedMedia(sanitizeHashLinks(content) as HomepageContent), hiddenSections }
  },
  ['film-expo-homepage-v26'],
  { tags: ['film-expo-homepage'] },
)

// Module-level in-memory store so repeated requests never touch the DB.
// Fresh entries are served instantly; stale entries are served immediately
// while a background refresh runs (stale-while-revalidate).
const MEMORY_TTL_MS = 30_000 // stale-while-revalidate window for the module-level cache
let memoryCache: { data: HomepageData; at: number } | null = null
let inflight: Promise<HomepageData> | null = null

export function invalidateHomepageContentMemory() {
  memoryCache = null
}

async function loadContent(): Promise<HomepageData> {
  const data = await getCachedContent()
  memoryCache = { data, at: Date.now() }
  return data
}

export function getHomepageContent(): Promise<HomepageData> {
  if (memoryCache && Date.now() - memoryCache.at < MEMORY_TTL_MS) {
    return Promise.resolve(memoryCache.data)
  }
  if (!inflight) {
    inflight = loadContent().finally(() => {
      inflight = null
    })
  }
  return memoryCache ? Promise.resolve(memoryCache.data) : inflight
}
