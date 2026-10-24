import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SpeakerProfile } from '@/components/speaker-profile'
import { PersonStructuredData } from '@/components/structured-data'
import { findSpeaker, speakerSlug } from '@/lib/speakers'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

async function resolve(slug: string) {
  const { content, hiddenSections } = await getHomepageContent()
  if (hiddenSections.includes('speakers')) return null
  const target = decodeURIComponent(slug)
  const index = content.speakers.items.findIndex((speaker, i) => speakerSlug(speaker, i) === target)
  if (index < 0) return null
  return { speaker: content.speakers.items[index], slug: target, content }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolve(slug)
  if (!resolved) return { title: 'Speakers | Film Expo India' }
  const { speaker, content } = resolved
  const description = speaker.bio || `${speaker.role} at ${speaker.organization || content.brand.name}`
  return {
    title: `${speaker.name} — ${speaker.role} | Film Expo India`,
    description: description.slice(0, 160),
  }
}

export default async function SpeakerPage({ params }: Props) {
  const { slug } = await params
  const resolved = await resolve(slug)
  if (!resolved) notFound()
  const { speaker, content } = resolved
  return (
    <>
      <SpeakerProfile speaker={speaker} page={content.speakersPage} brandName={content.brand.name} />
      <PersonStructuredData speaker={{ ...speaker, slug: resolved.slug }} />
    </>
  )
}
