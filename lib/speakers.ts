import type { HomepageContent } from './site-content'

export type Speaker = HomepageContent['speakers']['items'][number]

export function speakerSlug(speaker: Speaker, index: number): string {
  const explicit = speaker.slug?.trim()
  if (explicit) return explicit
  const base = `${speaker.name || 'speaker'}-${speaker.role || ''}`
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `speaker-${index + 1}`
}

export function findSpeaker(speakers: Speaker[], slug: string) {
  return speakers.find((speaker, index) => speakerSlug(speaker, index) === slug)
}
