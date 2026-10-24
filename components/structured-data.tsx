import { isoRange } from '@/lib/event-dates'
import { eventDateRange, formatEventPlace, type EventSchedule } from '@/lib/event-schedule'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmexpoindia.com'

function absUrl(path?: string) {
  if (!path) return undefined
  try {
    return new URL(path, SITE_URL).toString()
  } catch {
    return undefined
  }
}

type EventLike = EventSchedule & { year?: string; season?: string }

function buildEvent(event: EventLike, organizerName: string) {
  const range = eventDateRange(event)
  if (!range) return null
  const name = [organizerName, event.season, event.year && `(${event.year})`].filter(Boolean).join(' ')
  return {
    '@type': 'Event',
    name: name.trim(),
    startDate: range.start,
    endDate: range.end,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: formatEventPlace(event) || event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city || undefined,
        addressRegion: event.state || undefined,
        postalCode: event.pin || undefined,
        addressCountry: 'IN',
      },
    },
    organizer: { '@type': 'Organization', name: organizerName, url: SITE_URL },
  }
}

export function EventStructuredData({ events, organizerName }: { events: EventLike[]; organizerName: string }) {
  const graph = events.map((event) => buildEvent(event, organizerName)).filter(Boolean)
  if (!graph.length) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }}
    />
  )
}

export function OrganizationStructuredData({
  name,
  logo,
  description,
  socials,
}: {
  name: string
  logo?: string
  description?: string
  socials?: Array<{ name: string; url: string }>
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: SITE_URL,
    ...(logo && absUrl(logo) ? { logo: absUrl(logo) } : {}),
    ...(description ? { description } : {}),
    ...(socials?.length ? { sameAs: socials.map((social) => social.url).filter(Boolean) } : {}),
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

type BlogPostLike = {
  title: string
  slug: string
  author: string
  date: string
  excerpt: string
  image?: string
  category?: string
}

export function BlogPostingStructuredData({ post }: { post: BlogPostLike }) {
  const published = isoRange(post.date)?.start
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: absUrl(`/blog/${post.slug}`),
    ...(published ? { datePublished: published, dateModified: published } : {}),
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'Film Expo India', url: SITE_URL },
    ...(post.image && absUrl(post.image) ? { image: absUrl(post.image) } : {}),
    ...(post.category ? { keywords: post.category } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/blog/${post.slug}`) },
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

type SpeakerLike = {
  name: string
  role: string
  organization?: string
  image?: string
  slug: string
  bio?: string
  socials?: Array<{ label: string; url: string }>
}

function buildPerson(speaker: SpeakerLike) {
  const sameAs = (speaker.socials ?? []).map((social) => social.url).filter((url) => /^https?:\/\//i.test(url))
  return {
    '@type': 'Person',
    name: speaker.name,
    jobTitle: speaker.role,
    ...(speaker.organization ? { affiliation: { '@type': 'Organization', name: speaker.organization } } : {}),
    ...(speaker.bio ? { description: speaker.bio } : {}),
    ...(speaker.image && absUrl(speaker.image) ? { image: absUrl(speaker.image) } : {}),
    url: absUrl(`/speakers/${speaker.slug}`),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export function SpeakersStructuredData({ speakers, name }: { speakers: SpeakerLike[]; name: string }) {
  if (!speakers.length) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: speakers.map((speaker, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildPerson(speaker),
    })),
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

export function PersonStructuredData({ speaker }: { speaker: SpeakerLike }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...buildPerson(speaker) }) }}
    />
  )
}

