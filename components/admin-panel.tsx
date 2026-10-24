'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, CalendarDays, FileImage, FileText, LayoutDashboard, Mail, Menu, Search, Ticket, Users } from 'lucide-react'
import type { AdminModule, AdminPermissions } from '@/lib/admin-auth'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import homepageDefaults from '@/lib/homepage-default.json'
import { formatEventDates, formatEventPlace, formatEventTimes } from '@/lib/event-schedule'
import { GalleryManager } from './gallery-manager'
import { BlogManager } from './blog-manager'
import { AdminUserManager } from './admin-user-manager'
import { PastEventsManager } from './past-events-manager'

type AdminAccount = { email: string; role: 'superadmin' | 'subadmin'; permissions: AdminPermissions }

type MediaAsset = {
  id?: number
  public_path: string
  original_name: string
  media_type: 'image' | 'video'
  mime_type: string
  size_bytes: number
}

type AdminInquiry = {
  id: number
  name: string
  email: string
  phone: string
  company: string
  interest: string
  message: string
  created_at: string
}

type AdminEngagement = {
  id: number
  engagement_type: 'registration' | 'newsletter'
  email: string
  is_active: number
  privacy_accepted_at: string | null
  marketing_consent_at: string | null
  created_at: string
  updated_at: string
}

type EditableValue = string | number | boolean | null | EditableValue[] | { [key: string]: EditableValue }
type ContentPath = Array<string | number>
type AdminBooking = {
  id: number
  ticket_ref: string | null
  state: string
  city: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  tier_name: string
  quantity: number
  amount_paise: number
  currency: string
  status: 'created' | 'paid' | 'failed'
  refund_status: 'none' | 'refunded'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_refund_id: string | null
  created_at: string
  refunded_at: string | null
}
type BookingSummary = {
  rows: number
  ticketsSold: number
  grossPaise: number
  refundedPaise: number
  netCollectedPaise: number
  byLocation: Array<{ state: string; city: string; ticketsSold: number; netCollectedPaise: number }>
}
type AdminView = 'overview' | 'content' | 'media' | 'enquiries' | 'engagements' | 'bookings' | 'users'

const sectionGroups: Array<{ title: string; keys: ContentSectionKey[] }> = [
  { title: 'Global settings', keys: ['brand', 'navigation', 'footer'] },
  { title: 'Home page', keys: ['hero', 'pathways', 'homeAbout', 'stats', 'features', 'event', 'highlights', 'categories', 'speakers', 'testimonials', 'pastEvents', 'partners', 'gallery', 'news', 'closing'] },
  { title: 'About page', keys: ['aboutPage'] },
  { title: 'Exhibitors page', keys: ['exhibitReasons'] },
  { title: 'Conferences page', keys: ['conferenceProgramme'] },
  { title: 'Speakers page', keys: ['speakersPage'] },
  { title: 'Gallery page', keys: ['galleryPage'] },
  { title: 'Blog page', keys: ['blogPage'] },
  { title: 'Contact page', keys: ['contactPage'] },
  { title: 'Booking', keys: ['ticketing'] },
  { title: 'Legal pages', keys: ['legalPages'] },
]

const sectionGuidance: Partial<Record<ContentSectionKey, string>> = {
  brand: 'Update the name and logo visitors see across the website. Upload a logo file or choose one already in your media library.',
  navigation: 'Choose the words and destinations shown in the website menu. Use a full page address or an on-page link such as /about.',
  hero: 'This is the first banner visitors see. Update its headline, event details, main buttons, background image and optional background video.',
  homeAbout: 'Edit the short introduction and featured profile shown on the home page.',
  pathways: 'These are the three visitor, exhibitor and partner cards. Change their text, benefit lists and button destinations.',
  aboutPage: 'Edit the story, images, event details and closing message on the About page.',
  stats: 'Update the figures and labels shown in the home page statistics strip. Check all numbers before publishing.',
  features: 'Choose the feature cards that introduce the main things visitors can do at the expo.',
  event: 'Add or update upcoming event cards, including the date, venue, image and registration link.',
  highlights: 'Edit the key industry topics and short descriptions shown in the highlights section.',
  exhibitReasons: 'Explain why exhibitors should take part, including benefits, images and enquiry details.',
  categories: 'Manage the film-industry categories visitors can explore.',
  speakers: 'Add approved speaker names, roles, biographies and images. Confirm permissions before publishing portraits.',
  speakersPage: 'Edit the dedicated /speakers page introduction, section labels and disclaimer. Speaker profiles themselves are managed under the Home page Speakers section.',
  testimonials: 'Manage guest video or quote reviews. Use approved names, quotes and video permissions.',
  pastEvents: 'Add highlights from earlier editions. Upload an MP4 or WebM video and a cover image for each event.',
  partners: 'Manage partner information, logos, sponsorship benefits and enquiry details.',
  gallery: 'Choose photos from previous editions to show in the home page gallery.',
  news: 'Update the latest news cards and choose where each card links.',
  closing: 'Edit the final banner visitors see before the footer, including its image and registration button.',
  conferenceProgramme: 'Update the conference schedule, dates, sessions, speakers and event information. Confirm details before publishing.',
  galleryPage: 'Add or update gallery items, including their title, category, date, photo or optional video.',
  blogPage: 'Write and manage blog posts. Add a title, short summary, article text and cover image; video is optional.',
  contactPage: 'Update the contact page details, enquiry categories, form text and closing message.',
  footer: 'Change the website footer description, contact information, quick links and newsletter text.',
  ticketing: 'Manage the passes visitors can buy. "Price" is what is actually charged. To run an offer, set a higher "Full price (struck through)", add an offer name and the valid-from / valid-till dates, then tick "Show this offer" to make it visible. Uncheck it (or leave the dates expired) to hide the discount and show only the price. Paid checkout stays disabled until Razorpay keys are configured on the server.',
  legalPages: 'Edit the Privacy Policy, Terms & Conditions and Refund & Cancellation pages. Change the title, last-updated line, introduction and each heading and paragraph.',
}

const sectionNames: Record<ContentSectionKey, string> = {
  brand: 'Logo & brand',
  navigation: 'Navigation',
  hero: 'Hero banner',
  homeAbout: 'Homepage About section',
  pathways: 'Choose Your Path (Visitor / Exhibitor / Partner + countdown)',
  aboutPage: 'About page',
  stats: 'Statistics',
  features: 'Feature cards',
  event: 'Upcoming events',
  highlights: 'Key highlights',
  exhibitReasons: 'Reasons to exhibit',
  categories: 'Industry categories',
  speakers: 'Speakers',
  speakersPage: 'Speakers page (intro & labels)',
  testimonials: 'Guest reviews (video / quote testimonials)',
  pastEvents: 'Past events (scrolling video strip)',
  partners: 'Partners & exhibitors',
  gallery: 'Previous edition gallery',
  news: 'News & articles',
  closing: 'Closing banner',
  conferenceProgramme: 'Conference programme',
  galleryPage: 'Gallery page (past / present / future)',
  blogPage: 'Blog page (posts, images, videos)',
  contactPage: 'Contact page (info cards, categories, form, quote)',
  footer: 'Footer & contact',
  ticketing: 'Ticket & pass booking',
  legalPages: 'Legal pages (Privacy / Terms / Refund)',
}

function sectionLabel(key: ContentSectionKey) {
  return sectionNames[key] || key
}

async function readJson(response: Response) {
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object') throw new Error('Unexpected server response.')
  return body as Record<string, unknown>
}

function fieldName(value: string) {
  const familiarLabels: Record<string, string> = {
    bio: 'Biography',
    showOffer: 'Show this offer to visitors',
    stateLabel: 'State field label',
    cityLabel: 'City field label',
    locations: 'Event locations (state and cities)',
    cities: 'Cities in this state',
    state: 'State',
    city: 'City',
    pin: 'PIN code',
    startDate: 'Start date',
    endDate: 'End date',
    startTime: 'Start time',
    endTime: 'End time',
    actualPrice: 'Full price (struck through)',
    offerLabel: 'Offer name (e.g. Diwali Offer)',
    offerStart: 'Offer valid from',
    offerEnd: 'Offer valid till',
    session: 'Session',
    sessionLabel: 'Session heading',
    socials: 'Social links',
    socialsLabel: 'Connect heading',
    timeLabel: 'Time heading',
    venueLabel: 'Venue heading',
    bioLabel: 'About heading',
    listEyebrow: 'Section overline',
    listTitle: 'Section title',
    profileCtaLabel: 'Card button text',
    disclaimer: 'Disclaimer note',
    alt: 'Image description',
    author: 'Author name',
    body: 'Paragraph / article text',
    buttonHref: 'Button link',
    buttonLabel: 'Button text',
    category: 'Category',
    confirmationNote: 'Event confirmation note',
    date: 'Date',
    description: 'Description',
    excerpt: 'Short summary',
    featured: 'Show as featured story',
    hall: 'Hall or room',
    heading: 'Section heading',
    href: 'Link destination',
    image: 'Image',
    intro: 'Introduction',
    items: 'Items shown on this page',
    location: 'Location',
    logo: 'Partner logo',
    name: 'Name',
    poster: 'Video cover image',
    season: 'Event name',
    slug: 'Page web address',
    text: 'Supporting text',
    title: 'Title',
    updated: 'Last updated line',
    video: 'Video',
    venue: 'Venue',
    year: 'Year',
  }
  if (familiarLabels[value]) return familiarLabels[value]
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function updateAtPath(root: EditableValue, path: ContentPath, value: EditableValue): EditableValue {
  if (path.length === 0) return value
  const [key, ...remaining] = path

  if (Array.isArray(root) && typeof key === 'number') {
    return root.map((item, index) => index === key ? updateAtPath(item, remaining, value) : item)
  }

  if (root && typeof root === 'object' && !Array.isArray(root) && typeof key === 'string') {
    return { ...root, [key]: updateAtPath(root[key], remaining, value) }
  }

  return root
}

function addArrayEntry(items: EditableValue[], templateValue?: EditableValue): EditableValue {
  const first = items[0] ?? templateValue
  if (first && typeof first === 'object') return structuredClone(first)
  if (typeof first === 'number') return 0
  if (typeof first === 'boolean') return false
  return ''
}

function EditableField({
  name,
  value,
  path,
  assets,
  onChange,
  onMediaUpload,
  canUploadMedia,
  uploadingPath,
  onRemove,
  templateValue,
  parent,
}: {
  name: string
  value: EditableValue
  path: ContentPath
  assets: MediaAsset[]
  onChange: (path: ContentPath, value: EditableValue) => void
  onMediaUpload: (file: File, path: ContentPath, kind: 'image' | 'video') => void
  canUploadMedia: boolean
  uploadingPath: string | null
  onRemove?: () => void
  templateValue?: EditableValue
  parent?: Record<string, EditableValue>
}) {
  const fieldPath = path.join('.')
  const mediaKind = /image|logo|video|poster|cover/i.test(name)
    ? (/video/i.test(name) ? 'video' : 'image')
    : null
  const itemLabel: Record<string, string> = {
    cards: 'card',
    categories: 'category',
    events: 'event',
    items: 'item',
    links: 'link',
    partners: 'partner',
    points: 'benefit',
    posts: 'post',
    sections: 'section',
    sessions: 'session',
    socials: 'social link',
    perks: 'benefit',
    speakers: 'speaker',
  }

  if (Array.isArray(value)) {
    return (
      <fieldset className="admin-fieldset admin-array-fieldset">
        <legend>{fieldName(name)}</legend>
        <p className="admin-fieldset-help">Each item becomes one card or entry on the website. Add, edit or remove items below.</p>
        <div className="admin-array-fields">
          {value.map((item, index) => {
            const removeItem = () => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))
            return <div className="admin-array-item" key={`${name}-${index}`}>
              <EditableField
                name={`${fieldName(name)} ${index + 1}`}
                value={item}
                path={[...path, index]}
                assets={assets}
                onChange={onChange}
                onMediaUpload={onMediaUpload}
                canUploadMedia={canUploadMedia}
                uploadingPath={uploadingPath}
                onRemove={removeItem}
                templateValue={Array.isArray(templateValue) ? templateValue[index] ?? templateValue[0] : undefined}
              />
              <button type="button" className="admin-remove-item" onClick={removeItem}>Remove</button>
            </div>
          })}
        </div>
        <button type="button" className="admin-add-item" onClick={() => onChange(path, [...value, addArrayEntry(value, Array.isArray(templateValue) ? templateValue[0] : undefined)])}>+ Add {itemLabel[name] || 'item'}</button>
      </fieldset>
    )
  }

  if (value && typeof value === 'object') {
    const containsList = Object.values(value).some(Array.isArray)
    return (
      <fieldset className={`admin-fieldset admin-object-fields${containsList ? ' admin-object-with-list' : ''}`}>
        <legend>{fieldName(name)}</legend>
        {Object.entries(value).map(([key, child]) => (
          <EditableField key={[...path, key].join('.')} name={key} value={child} path={[...path, key]} assets={assets} onChange={onChange} onMediaUpload={onMediaUpload} canUploadMedia={canUploadMedia} uploadingPath={uploadingPath} parent={value as Record<string, EditableValue>} templateValue={templateValue && typeof templateValue === 'object' && !Array.isArray(templateValue) ? templateValue[key] : undefined} />
        ))}
      </fieldset>
    )
  }

  if (typeof value === 'boolean') {
    return <label className="admin-boolean-field"><input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />{fieldName(name)}</label>
  }

  if (typeof value === 'number') {
    return <label className="admin-edit-field"><span>{fieldName(name)}</span><input type="number" value={value} onChange={(event) => onChange(path, Number(event.target.value))} /></label>
  }

  const textValue = value ?? ''
  const mediaAssets = mediaKind ? assets.filter((asset) => asset.media_type === mediaKind) : []
  const sharedInput = mediaKind && (
    <select aria-label={`Choose uploaded ${mediaKind} for ${fieldName(name)}`} value="" onChange={(event) => event.target.value && onChange(path, event.target.value)}>
      <option value="">Choose uploaded {mediaKind}…</option>
      {mediaAssets.map((asset) => <option key={asset.public_path} value={asset.public_path}>{asset.original_name}</option>)}
    </select>
  )

  const DATE_FIELDS = ['startDate', 'endDate', 'offerStart', 'offerEnd']
  const TIME_FIELDS = ['startTime', 'endTime']
  const MIN_SOURCE: Record<string, string> = { endDate: 'startDate', offerEnd: 'offerStart' }
  const isDateField = DATE_FIELDS.includes(name)
  const isTimeField = TIME_FIELDS.includes(name)
  const minValue = MIN_SOURCE[name] ? String(parent?.[MIN_SOURCE[name]] ?? '') || undefined : undefined

  return (
    <label className="admin-edit-field">
      <span>{fieldName(name)}</span>
      {textValue.length > 100 || textValue.includes('\n')
        ? <textarea rows={3} value={textValue} onChange={(event) => onChange(path, event.target.value)} />
        : isDateField || isTimeField
          ? <input
            type={isDateField ? 'date' : 'time'}
            value={textValue}
            min={minValue}
            onChange={(event) => onChange(path, event.target.value)}
          />
          : <input type="text" value={textValue} onChange={(event) => onChange(path, event.target.value)} />}
      {name === 'href' || name === 'buttonHref' ? <small className="admin-field-hint">Where the visitor goes after clicking. Examples: /about, /contact or #registration.</small> : null}
      {name === 'date' ? <small className="admin-field-hint">Only used when Start date below is empty. Pick Start date for a calendar-ready format.</small> : null}
      {name === 'endDate' && minValue ? <small className="admin-field-hint">Cannot be earlier than the start date ({minValue}).</small> : null}
      {sharedInput}
      {mediaKind && canUploadMedia && <span className="admin-inline-upload">
        {uploadingPath === fieldPath ? 'Uploading…' : `Upload ${mediaKind}`}
        <input
          type="file"
          accept={mediaKind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'video/mp4,video/webm'}
          disabled={uploadingPath !== null}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) onMediaUpload(file, path, mediaKind)
            event.currentTarget.value = ''
          }}
        />
      </span>}
      {mediaKind && <small className="admin-field-hint">{mediaKind === 'image'
        ? canUploadMedia ? 'Upload a new image or choose one already in your media library.' : 'Choose an image already in your media library. Ask a superadmin if you need a new upload.'
        : canUploadMedia ? 'Upload an MP4 or WebM video, or choose one already in your media library.' : 'Choose a video already in your media library. Ask a superadmin if you need a new upload.'}</small>}
    </label>
  )
}

export function AdminPanel({
  initiallyAuthenticated,
  setupRequired,
  setupTokenRequired,
  initialAccount,
}: {
  initiallyAuthenticated: boolean
  setupRequired: boolean
  setupTokenRequired: boolean
  initialAccount: AdminAccount | null
}) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated)
  const [setupMode, setSetupMode] = useState(setupRequired)
  const [account, setAccount] = useState<AdminAccount | null>(initialAccount)
  const [activeView, setActiveView] = useState<AdminView>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sectionSearch, setSectionSearch] = useState('')
  const [content, setContent] = useState<HomepageContent | null>(null)
  const [drafts, setDrafts] = useState<Partial<Record<ContentSectionKey, string>>>({})
  const [hiddenSections, setHiddenSections] = useState<ContentSectionKey[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [engagements, setEngagements] = useState<AdminEngagement[]>([])
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [bookingsSummary, setBookingsSummary] = useState<BookingSummary | null>(null)
  const [bookingFilter, setBookingFilter] = useState<{ state: string; city: string }>({ state: '', city: '' })
  const [refundingId, setRefundingId] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<ContentSectionKey>('hero')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingPath, setUploadingPath] = useState<string | null>(null)
  const [advancedEditing, setAdvancedEditing] = useState(false)
  const hasUnsavedChanges = activeView === 'content' && Boolean(content)
    && drafts[activeSection] !== JSON.stringify(content?.[activeSection], null, 2)

  async function loadAdminData() {
    const canRead = (module: AdminModule) => account?.role === 'superadmin'
      || account?.permissions[module]?.read === true || account?.permissions[module]?.edit === true
    const fetchAdminData = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store' })
      const body = await readJson(response)
      if (!response.ok) throw new Error(String(body.error || 'Could not load admin data.'))
      return body
    }
    const [contentData, mediaData, inquiryData, engagementData, bookingData] = await Promise.all([
      canRead('content') || canRead('gallery') || canRead('blog')
        ? fetchAdminData('/api/superadmin/content')
        : null,
      canRead('media') ? fetchAdminData('/api/superadmin/media') : null,
      canRead('enquiries') ? fetchAdminData('/api/exhibitor-inquiries') : null,
      canRead('engagements') ? fetchAdminData('/api/superadmin/engagements') : null,
      canRead('bookings') ? fetchAdminData('/api/superadmin/bookings') : null,
    ])
    const loadedContent = contentData ? contentData.content as HomepageContent : null
    if (loadedContent) {
      setContent(loadedContent)
      setDrafts(Object.fromEntries(
        Object.entries(loadedContent).map(([key, section]) => [key, JSON.stringify(section, null, 2)]),
      ) as Partial<Record<ContentSectionKey, string>>)
      setHiddenSections((contentData?.hiddenSections || []) as ContentSectionKey[])
      const keys = Object.keys(loadedContent) as ContentSectionKey[]
      if (keys.length && !keys.includes(activeSection)) setActiveSection(keys[0])
    } else {
      setContent(null)
      setDrafts({})
    }
    setAssets((mediaData?.assets || []) as MediaAsset[])
    setInquiries((inquiryData?.inquiries || []) as AdminInquiry[])
    setEngagements((engagementData?.engagements || []) as AdminEngagement[])
    setBookings((bookingData?.bookings || []) as AdminBooking[])
    setBookingsSummary((bookingData?.summary || null) as BookingSummary | null)
    setBookingFilter({ state: '', city: '' })
  }

  useEffect(() => {
    if (!authenticated) return
    loadAdminData().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the admin panel.')
    })
  }, [authenticated, account])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [hasUnsavedChanges])

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (setupMode && password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    const response = await fetch(setupMode ? '/api/superadmin/setup' : '/api/superadmin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(setupMode && setupTokenRequired ? { setupToken } : {}) }),
    })
    const body = await readJson(response)
    if (!response.ok) {
      setError(String(body.error || 'Login failed.'))
      return
    }
    setPassword('')
    setConfirmPassword('')
    setSetupMode(false)
    setAuthenticated(true)
    const sessionResponse = await fetch('/api/superadmin/auth', { cache: 'no-store' })
    const sessionBody = await readJson(sessionResponse)
    if (sessionResponse.ok && sessionBody.account && typeof sessionBody.account === 'object') {
      setAccount(sessionBody.account as AdminAccount)
    } else if (setupMode) {
      setAccount({ email, role: 'superadmin', permissions: {} })
    }
  }

  async function logout() {
    setError('')
    const response = await fetch('/api/superadmin/auth', { method: 'DELETE' })
    if (!response.ok) {
      const body = await readJson(response)
      setError(String(body.error || 'Could not sign out.'))
      return
    }
    setAuthenticated(false)
    setAccount(null)
    setContent(null)
    setActiveView('overview')
  }

  function updateField(path: ContentPath, value: EditableValue) {
    try {
      const current: unknown = JSON.parse(drafts[activeSection] || '')
      if (!current || typeof current !== 'object' || Array.isArray(current)) throw new Error('The section JSON must be an object.')
      const updated = updateAtPath(current as EditableValue, path, value)
      setDrafts({ ...drafts, [activeSection]: JSON.stringify(updated, null, 2) })
      setError('')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'The section JSON is invalid.')
    }
  }

  function changeEditorMode(useAdvancedEditor: boolean) {
    if (!useAdvancedEditor) {
      try {
        JSON.parse(drafts[activeSection] || '')
      } catch {
        setError('Fix the JSON syntax before switching back to the visual editor.')
        return
      }
    }
    setAdvancedEditing(useAdvancedEditor)
    setError('')
  }

  async function saveSection() {
    if (!content) return
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const value: unknown = JSON.parse(drafts[activeSection] || '')
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('A section must be a JSON object.')
      }

      const response = await fetch('/api/superadmin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: activeSection,
          content: value,
          isVisible: !hiddenSections.includes(activeSection),
        }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(String(body.error || 'Could not save this section.'))

      setContent({ ...content, [activeSection]: value } as HomepageContent)
      setDrafts((current) => ({ ...current, [activeSection]: JSON.stringify(value, null, 2) }))
      setMessage(`${sectionLabel(activeSection)} saved. The live page will update shortly.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this section.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSection() {
    if (!content) return
    const isVisible = hiddenSections.includes(activeSection)
    const response = await fetch('/api/superadmin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionKey: activeSection,
        content: content[activeSection],
        isVisible,
      }),
    })
    const body = await readJson(response)
    if (!response.ok) {
      setError(String(body.error || 'Could not change section visibility.'))
      return
    }
    setHiddenSections(isVisible
      ? hiddenSections.filter((section) => section !== activeSection)
      : [...hiddenSections, activeSection])
    setMessage(`${sectionLabel(activeSection)} is now ${isVisible ? 'visible' : 'hidden'} on the website.`)
    setError('')
  }

  async function uploadFile(file: File, target?: { path: ContentPath; kind: 'image' | 'video' }) {
    setUploading(true)
    setUploadingPath(target?.path.join('.') || null)
    setError('')
    setMessage('')
    const formData = new FormData()
    formData.set('file', file)

    try {
      const response = await fetch('/api/superadmin/media', { method: 'POST', body: formData })
      const body = await readJson(response)
      if (!response.ok) throw new Error(String(body.error || 'Upload failed.'))
      const asset = body.asset as {
        publicPath: string
        originalName: string
        mediaType: 'image' | 'video'
        mimeType: string
        sizeBytes: number
      }
      if (target && asset.mediaType !== target.kind) {
        throw new Error(`This field requires an uploaded ${target.kind}.`)
      }
      setAssets((current) => [{
        public_path: asset.publicPath,
        original_name: asset.originalName,
        media_type: asset.mediaType,
        mime_type: asset.mimeType,
        size_bytes: asset.sizeBytes,
      }, ...current])
      if (target) updateField(target.path, asset.publicPath)
      setMessage(`Optimized media uploaded: ${asset.publicPath}`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setUploading(false)
      setUploadingPath(null)
    }
  }

  async function uploadMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    await uploadFile(file)
    input.value = ''
  }

  async function copyAssetPath(publicPath: string) {
    try {
      await navigator.clipboard.writeText(publicPath)
      setError('')
      setMessage('File link copied. Paste it into the matching photo or video field while editing a page.')
    } catch {
      setError('Could not copy the file link. Select and copy the file address shown in the library instead.')
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={login}>
          <span className="admin-eyebrow">FILM EXPO INDIA / CMS</span>
          <h1>{setupMode ? 'Create primary admin' : 'Superadmin sign in'}</h1>
          <p>{setupMode ? 'One-time setup. Your password is stored only as a secure hash.' : 'Sign in with your admin email and password.'}</p>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {setupMode && setupTokenRequired && <label>One-time setup token<input type="password" autoComplete="off" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} required /></label>}
          <label>Password<input type="password" autoComplete={setupMode ? 'new-password' : 'current-password'} minLength={setupMode ? 12 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {setupMode && <label>Confirm password<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>}
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="admin-primary-button" type="submit">{setupMode ? 'Create admin account' : 'Sign in'}</button>
          <a className="admin-back-link" href="/">← Back to website</a>
        </form>
      </main>
    )
  }

  const canReadModule = (module: AdminModule) => account?.role === 'superadmin'
    || account?.permissions[module]?.read === true || account?.permissions[module]?.edit === true
  const canEditModule = (module: AdminModule) => account?.role === 'superadmin' || account?.permissions[module]?.edit === true
  const moduleForSection = (key: string): AdminModule => key === 'galleryPage' ? 'gallery' : key === 'blogPage' ? 'blog' : 'content'
  const sectionKeys = content
    ? (Object.keys(content) as ContentSectionKey[]).filter((key) => canReadModule(moduleForSection(key)))
    : []
  const filteredSectionKeys = sectionKeys.filter((key) => sectionLabel(key).toLowerCase().includes(sectionSearch.trim().toLowerCase()))
  const canEditSection = canEditModule(moduleForSection(activeSection))
  const showOverview = activeView === 'overview'
  const showUsers = activeView === 'users'
  const dashboardMetrics = [
    { label: 'Website sections', value: content ? sectionKeys.length : '—', detail: 'Content areas you can access', icon: LayoutDashboard },
    { label: 'Published sections', value: content ? sectionKeys.filter((key) => !hiddenSections.includes(key)).length : '—', detail: 'Visible on the live website', icon: FileText },
    ...(canReadModule('media') ? [{ label: 'Media assets', value: assets.length, detail: 'Uploaded images and videos', icon: FileImage }] : []),
    ...((canReadModule('enquiries') || canReadModule('engagements')) ? [{
      label: 'New submissions',
      value: (canReadModule('enquiries') ? inquiries.length : 0) + (canReadModule('engagements') ? engagements.length : 0),
      detail: 'Enquiries, registrations & updates',
      icon: Mail,
    }] : []),
    ...(canReadModule('content') ? [{ label: 'Upcoming events', value: content?.event.items.length ?? '—', detail: 'Listed in your event section', icon: CalendarDays }] : []),
  ]
  const quickSectionKeys: ContentSectionKey[] = ['hero', 'pathways', 'event', 'partners', 'gallery', 'news', 'closing']
  const quickSections = quickSectionKeys.filter((key) => sectionKeys.includes(key))
  const recentSubmissions = [
    ...(canReadModule('enquiries') ? inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      name: inquiry.name,
      email: inquiry.email,
      category: inquiry.interest || 'Exhibitor enquiry',
      createdAt: inquiry.created_at,
      type: 'Enquiry',
    })) : []),
    ...(canReadModule('engagements') ? engagements.map((engagement) => ({
      id: `engagement-${engagement.id}`,
      name: engagement.email,
      email: engagement.email,
      category: engagement.engagement_type === 'newsletter' ? 'Newsletter' : 'Registration',
      createdAt: engagement.created_at,
      type: engagement.engagement_type === 'newsletter' ? 'Subscriber' : 'Registration',
    })) : []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const openSection = (key: ContentSectionKey) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leave this page and discard them?')) return
    setActiveSection(key)
    setActiveView('content')
    setSidebarOpen(false)
    setError('')
    setMessage('')
  }
  const openView = (view: AdminView) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leave this page and discard them?')) return
    setActiveView(view)
    setSidebarOpen(false)
    setError('')
    setMessage('')
  }
  const discardSectionChanges = () => {
    if (!content) return
    setDrafts((current) => ({ ...current, [activeSection]: JSON.stringify(content[activeSection], null, 2) }))
    setError('')
    setMessage('Your unsaved changes were discarded.')
  }

  async function adminRefund(booking: AdminBooking) {
    if (!window.confirm(`Refund ${booking.buyer_name} — ${booking.quantity} × ${booking.tier_name} (₹${(booking.amount_paise / 100).toLocaleString('en-IN')})? This cancels the pass and reverses the payment.`)) return
    setRefundingId(booking.id)
    setError('')
    try {
      const response = await fetch('/api/superadmin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(String(body.error || 'The refund could not be processed.'))
      setBookings((current) => current.map((item) => item.id === booking.id
        ? { ...item, refund_status: 'refunded' as const, razorpay_refund_id: String(body.refundId || ''), refunded_at: new Date().toISOString() }
        : item))
      setMessage(`Refund processed for ${booking.buyer_name}. Refund reference ${body.refundId}.`)
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : 'The refund could not be processed.')
    } finally {
      setRefundingId(null)
    }
  }

  async function applyBookingFilter(next: { state: string; city: string }) {
    setBookingFilter(next)
    setError('')
    try {
      const params = new URLSearchParams()
      if (next.state) params.set('state', next.state)
      if (next.city) params.set('city', next.city)
      const response = await fetch(`/api/superadmin/bookings?${params.toString()}`, { cache: 'no-store' })
      const body = await readJson(response)
      if (!response.ok) throw new Error(String(body.error || 'Could not load bookings.'))
      setBookings((body.bookings || []) as AdminBooking[])
      setBookingsSummary((body.summary || null) as BookingSummary | null)
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : 'Could not load bookings.')
    }
  }

  const bookingLocationOptions: Array<{ state: string; cities: string[] }> = content?.ticketing?.locations?.length
    ? content.ticketing.locations
    : (() => {
      const map = new Map<string, string[]>()
      for (const item of bookings) {
        const key = item.state || '-'
        const list = map.get(key) || []
        if (item.city && !list.includes(item.city)) list.push(item.city)
        map.set(key, list)
      }
      return [...map.entries()].map(([state, cities]) => ({ state, cities }))
    })()

  const bookingCities = (bookingLocationOptions.find((loc) => loc.state === bookingFilter.state)?.cities) || []
  const bookingExportQuery = `${bookingFilter.state ? `&state=${encodeURIComponent(bookingFilter.state)}` : ''}${bookingFilter.city ? `&city=${encodeURIComponent(bookingFilter.city)}` : ''}`

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-brand">
          <button className="admin-menu-button" type="button" aria-label="Toggle dashboard navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><Menu size={19} /></button>
          <a href="/" className="admin-brand">
            {content?.brand?.logo ? (
              <Image className="admin-brand-logo" src={content.brand.logo} alt="" width={32} height={32} />
            ) : (
              <span className="admin-brand-mark">◉</span>
            )}
            <span>{content?.brand?.name || 'FILM EXPO INDIA'}<small>CONTENT STUDIO</small></span>
          </a>
        </div>
        <label className="admin-global-search"><Search size={15} /><input type="search" value={sectionSearch} onChange={(event) => setSectionSearch(event.target.value)} placeholder="Search sections…" aria-label="Search dashboard sections" /></label>
        <div className="admin-header-actions"><span className="admin-account-label">{account?.email} · {account?.role === 'superadmin' ? 'Superadmin' : 'Sub-admin'}</span></div>
      </header>
      <div className={`admin-layout${sidebarOpen ? ' admin-layout--sidebar-open' : ''}`}>
        <button type="button" className="admin-sidebar-backdrop" aria-label="Close dashboard navigation" onClick={() => setSidebarOpen(false)} />
        <aside className="admin-sidebar" aria-label="Dashboard navigation">
          <span className="admin-sidebar-label">WORKSPACE</span>
          <nav aria-label="Dashboard">
            <button className={activeView === 'overview' ? 'active' : ''} onClick={() => openView('overview')}><LayoutDashboard size={16} /><span>Dashboard</span></button>
          </nav>
          {sectionGroups.map((group) => {
            const groupKeys = group.keys.filter((key) => filteredSectionKeys.includes(key))
            if (!groupKeys.length) return null
            return <div className="admin-nav-group" key={group.title}>
              <span className="admin-sidebar-label">{group.title}</span>
              <nav aria-label={group.title}>
                {groupKeys.map((key) => (
                  <button key={key} className={activeView === 'content' && activeSection === key ? 'active' : ''} onClick={() => openSection(key)}>
                    <FileText size={15} /><span>{sectionLabel(key)}</span>
                    {hiddenSections.includes(key) && <small>Hidden</small>}
                  </button>
                ))}
              </nav>
            </div>
          })}
          {sectionKeys.length > 0 && !filteredSectionKeys.length && <p className="admin-nav-empty">No matching sections.</p>}
          {canReadModule('media') && <div className="admin-nav-group"><span className="admin-sidebar-label">LIBRARY</span><nav aria-label="Media library">
            <button className={activeView === 'media' ? 'active' : ''} onClick={() => openView('media')}><FileImage size={15} /><span>Media library</span></button>
          </nav></div>}
          {(canReadModule('enquiries') || canReadModule('engagements') || canReadModule('bookings')) && <div className="admin-nav-group"><span className="admin-sidebar-label">SUBMISSIONS</span><nav aria-label="Submissions">
            {canReadModule('enquiries') && <button className={activeView === 'enquiries' ? 'active' : ''} onClick={() => openView('enquiries')}><Mail size={15} /><span>Exhibitor enquiries</span></button>}
            {canReadModule('engagements') && <button className={activeView === 'engagements' ? 'active' : ''} onClick={() => openView('engagements')}><Users size={15} /><span>Registrations &amp; subscribers</span></button>}
            {canReadModule('bookings') && <button className={activeView === 'bookings' ? 'active' : ''} onClick={() => openView('bookings')}><Ticket size={15} /><span>Pass bookings</span></button>}
          </nav></div>}
          {account?.role === 'superadmin' && <div className="admin-nav-group"><span className="admin-sidebar-label">ADMINISTRATION</span><nav aria-label="Administration">
            <button className={activeView === 'users' ? 'active' : ''} onClick={() => openView('users')}><Users size={15} /><span>Admin accounts &amp; access</span></button>
          </nav></div>}
          <a className="admin-sidebar-site-link" href="/"><span>Open public website</span><ArrowRight size={14} /></a>
          <button className="admin-sidebar-logout" onClick={logout}><span>Sign out</span><ArrowRight size={14} /></button>
        </aside>

        <section className="admin-workspace">
          {showUsers ? <AdminUserManager /> : <>
          {showOverview && <div className="admin-dashboard">
            <div className="admin-dashboard-banner">
              {content?.hero.image && <Image className="admin-dashboard-banner-image" src={content.hero.image} alt="" fill sizes="(max-width: 900px) 100vw, 1200px" priority />}
              <div className="admin-dashboard-banner-copy">
                <span className="admin-eyebrow">FILM EXPO INDIA · CONTENT STUDIO</span>
                <h2>Welcome back,<br /><strong>{account?.email?.split('@')[0] || 'Admin'}</strong></h2>
                <p>Manage website content, event information and audience submissions from one place.</p>
                <small>{account?.role === 'superadmin' ? 'Superadmin · Full workspace access' : 'Sub-admin · Permission-based access'}</small>
              </div>
              <div className="admin-dashboard-banner-quote">Stories connect us.<br /><span>Let’s make the next one count.</span></div>
            </div>
            <div className="admin-dashboard-metrics">
              {dashboardMetrics.map((metric) => (
                <article className="admin-dashboard-metric" key={metric.label}>
                  <span className="admin-dashboard-metric-icon"><metric.icon size={20} /></span>
                  <span className="admin-dashboard-metric-copy"><b>{metric.label}</b><strong>{metric.value}</strong><small>{metric.detail}</small></span>
                </article>
              ))}
            </div>
            <div className="admin-dashboard-main-grid">
              <section className="admin-dashboard-panel admin-dashboard-events">
                <div className="admin-dashboard-panel-heading"><div><span className="admin-eyebrow">EVENT MANAGEMENT</span><h3>Upcoming events</h3></div>{sectionKeys.includes('event') && <button type="button" onClick={() => openSection('event')}>View all <ArrowRight size={13} /></button>}</div>
                {canReadModule('content') && content?.event.items.length ? <div className="admin-dashboard-event-list">
                  {content.event.items.slice(0, 3).map((event, index) => (
                    <article className="admin-dashboard-event" key={`${event.season}-${index}`}>
                      <div className="admin-dashboard-event-image">{event.image && <Image src={event.image} alt="" fill sizes="88px" />}</div>
                      <div><strong>{event.season || `Event ${index + 1}`}</strong><span><CalendarDays size={13} />{[formatEventDates(event) || event.year, formatEventTimes(event)].filter(Boolean).join(' · ')}</span><small>{formatEventPlace(event) || content.event.venue}</small></div>
                      {event.badge && <em>{event.badge}</em>}
                    </article>
                  ))}
                </div> : <p className="admin-dashboard-empty">No upcoming events are available to this account.</p>}
              </section>
              <section className="admin-dashboard-panel admin-dashboard-quick-actions">
                <div className="admin-dashboard-panel-heading"><div><span className="admin-eyebrow">SHORTCUTS</span><h3>Quick actions</h3></div></div>
                <div className="admin-dashboard-action-grid">
                  {quickSections.slice(0, 4).map((key) => <button type="button" key={key} onClick={() => openSection(key)}><FileText size={18} /><span>Edit {sectionLabel(key)}</span></button>)}
                  {canReadModule('media') && <button type="button" onClick={() => openView('media')}><FileImage size={18} /><span>Open media library</span></button>}
                  {canReadModule('enquiries') && <button type="button" onClick={() => openView('enquiries')}><Mail size={18} /><span>View enquiries</span></button>}
                  {canReadModule('engagements') && <button type="button" onClick={() => openView('engagements')}><Users size={18} /><span>View registrations</span></button>}
                  {canReadModule('bookings') && <button type="button" onClick={() => openView('bookings')}><Ticket size={18} /><span>View pass bookings</span></button>}
                </div>
              </section>
              <section className="admin-dashboard-panel admin-dashboard-activity">
                <div className="admin-dashboard-panel-heading"><div><span className="admin-eyebrow">LATEST UPDATES</span><h3>Recent submissions</h3></div>{canReadModule('engagements') && <button type="button" onClick={() => openView('engagements')}>View all <ArrowRight size={13} /></button>}</div>
                {recentSubmissions.length ? <div className="admin-dashboard-submissions">
                  {recentSubmissions.map((submission) => (
                    <article key={submission.id}><div><strong>{submission.name}</strong><span>{submission.category}</span></div><small>{new Date(submission.createdAt).toLocaleDateString()}</small><em>{submission.type}</em></article>
                  ))}
                </div> : <p className="admin-dashboard-empty">No recent submissions yet, or this account does not have submission access.</p>}
              </section>
              <section className="admin-dashboard-panel admin-dashboard-site-status">
                <div className="admin-dashboard-panel-heading"><div><span className="admin-eyebrow">SITE CONTENT</span><h3>Website overview</h3></div></div>
                <div className="admin-dashboard-status-list">
                  <div><span>Published sections</span><strong>{content ? sectionKeys.filter((key) => !hiddenSections.includes(key)).length : '—'} <small>/ {content ? sectionKeys.length : '—'}</small></strong></div>
                  <div className="admin-dashboard-progress"><span style={{ width: `${content && sectionKeys.length ? sectionKeys.filter((key) => !hiddenSections.includes(key)).length / sectionKeys.length * 100 : 0}%` }} /></div>
                  <div><span>Hidden sections</span><strong>{content ? sectionKeys.filter((key) => hiddenSections.includes(key)).length : '—'}</strong></div>
                  <div><span>Admin role</span><strong>{account?.role === 'superadmin' ? 'Superadmin' : 'Sub-admin'}</strong></div>
                </div>
              </section>
            </div>
          </div>}
          {activeView === 'content' && !content && <p className="admin-help">No website content is available to this account.</p>}
          {activeView === 'content' && sectionKeys.length > 0 && content && <>
          <div className="admin-panel-heading">
            <div><span className="admin-eyebrow">WEBSITE CONTENT · {sectionGroups.find((group) => group.keys.includes(activeSection))?.title || 'PAGE SETTINGS'}</span><h2>{sectionLabel(activeSection)}</h2></div>
            {canEditSection && <button className={`admin-visibility-button ${hiddenSections.includes(activeSection) ? 'is-hidden' : ''}`} onClick={toggleSection}>
              {hiddenSections.includes(activeSection) ? 'Show section' : 'Hide section'}
            </button>}
          </div>
          {!canEditSection && <p className="admin-help">Read-only access for this section.</p>}
          <div className="admin-section-guide">
            <strong>What you can do here</strong>
            <p>{sectionGuidance[activeSection] || 'Update the details shown on this page. Changes appear on the website after you save.'}</p>
            <span>Tip: Changes are not public until you select “Save changes”.</span>
          </div>
          {['speakers', 'testimonials', 'stats'].includes(activeSection) && <p className="admin-help admin-content-review-note">Confirm names, roles, quotes, figures and image permissions with the event team before publishing. Replace all sample or illustrative details with approved information.</p>}
          {activeSection === 'conferenceProgramme' && <p className="admin-help admin-content-review-note">Review every date, venue, speaker, session and metric. Starter details are unconfirmed; publish only after the event team approves them.</p>}
          {canEditSection ? <>
          <div className="admin-editor-modes">
            <button className={!advancedEditing ? 'active' : ''} onClick={() => changeEditorMode(false)}>Visual editor</button>
            <button className={advancedEditing ? 'active' : ''} onClick={() => changeEditorMode(true)}>Advanced JSON</button>
          </div>
          {content && advancedEditing ? <textarea
              className="admin-json-editor"
              aria-label={`${sectionLabel(activeSection)} JSON`}
              spellCheck={false}
              value={drafts[activeSection] || ''}
              onChange={(event) => setDrafts({ ...drafts, [activeSection]: event.target.value })}
            /> : content && (
              <div className="admin-visual-editor">
                {(() => {
                  try {
                    const parsed = JSON.parse(drafts[activeSection] || '{}') as EditableValue
                    if (activeSection === 'blogPage' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      const { posts, ...rest } = parsed as { [key: string]: EditableValue }
                      const categories = Array.isArray(rest.categories) ? rest.categories.map(String) : []
                      return <>
                        <BlogManager
                          posts={(Array.isArray(posts) ? posts : []) as never}
                          categories={categories}
                          assets={assets}
                          uploadingPath={uploadingPath}
                          canReadMedia={canReadModule('media')}
                          canUploadMedia={canEditModule('media')}
                          onPostsChange={(next) => updateField(['posts'], next as unknown as EditableValue)}
                          onUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                        />
                        <EditableField
                          name="Page settings"
                          value={rest}
                          path={[]}
                          assets={assets}
                          onChange={updateField}
                          onMediaUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                          canUploadMedia={canEditModule('media')}
                          uploadingPath={uploadingPath}
                          templateValue={homepageDefaults[activeSection] as EditableValue}
                        />
                      </>
                    }
                    if (activeSection === 'galleryPage' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      const { items, ...rest } = parsed as { [key: string]: EditableValue }
                      const categories = Array.isArray(rest.categories) ? rest.categories.map(String) : []
                      return <>
                        <GalleryManager
                          items={(Array.isArray(items) ? items : []) as never}
                          categories={categories}
                          assets={assets}
                          uploadingPath={uploadingPath}
                          canReadMedia={canReadModule('media')}
                          canUploadMedia={canEditModule('media')}
                          onItemsChange={(next) => updateField(['items'], next as unknown as EditableValue)}
                          onUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                        />
                        <EditableField
                          name="Page settings"
                          value={rest}
                          path={[]}
                          assets={assets}
                          onChange={updateField}
                          onMediaUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                          canUploadMedia={canEditModule('media')}
                          uploadingPath={uploadingPath}
                          templateValue={homepageDefaults[activeSection] as EditableValue}
                        />
                      </>
                    }
                    if (activeSection === 'pastEvents' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      const { items, ...rest } = parsed as { [key: string]: EditableValue }
                      return <>
                        <PastEventsManager
                          items={(Array.isArray(items) ? items : []) as HomepageContent['pastEvents']['items']}
                          assets={assets}
                          uploadingPath={uploadingPath}
                          canUploadMedia={canEditModule('media')}
                          onItemsChange={(next) => updateField(['items'], next as unknown as EditableValue)}
                          onUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                        />
                        <EditableField
                          name="Section settings"
                          value={rest}
                          path={[]}
                          assets={assets}
                          onChange={updateField}
                          onMediaUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                          canUploadMedia={canEditModule('media')}
                          uploadingPath={uploadingPath}
                          templateValue={homepageDefaults[activeSection] as EditableValue}
                        />
                      </>
                    }
                    return <EditableField
                      name={sectionLabel(activeSection)}
                      value={parsed}
                      path={[]}
                      assets={assets}
                      onChange={updateField}
                      onMediaUpload={(file, path, kind) => { void uploadFile(file, { path, kind }) }}
                      canUploadMedia={canEditModule('media')}
                      uploadingPath={uploadingPath}
                      templateValue={homepageDefaults[activeSection] as EditableValue}
                    />
                  } catch {
                    return <p className="admin-error">This section contains invalid JSON. Switch to Advanced JSON to repair it.</p>
                  }
                })()}
              </div>
            )}
          {error && <p className="admin-error" role="alert">{error}</p>}
          {message && <p className="admin-success" role="status">{message}</p>}
          <div className="admin-save-row">
            <button className="admin-primary-button" onClick={saveSection} disabled={saving || !content || !hasUnsavedChanges}>{saving ? 'Saving changes…' : 'Save changes'}</button>
            {hasUnsavedChanges && <button className="admin-discard-button" type="button" onClick={discardSectionChanges} disabled={saving}>Discard changes</button>}
            <span className={hasUnsavedChanges ? 'admin-save-pending' : 'admin-save-saved'}>{hasUnsavedChanges ? 'You have changes that are not saved yet.' : 'All changes are saved.'}</span>
          </div>
          </> : <pre className="admin-readonly-json">{drafts[activeSection] || 'No content available.'}</pre>}
          </>}

          {activeView === 'media' && canReadModule('media') && <>
          <div className="admin-page-intro"><span className="admin-eyebrow">YOUR UPLOADED FILES</span><h2>Media library</h2><p>Upload photos or videos once, then choose them while editing a website section. Images are optimized automatically. MP4/WebM videos can be up to 50 MB.</p></div>
          <div className="admin-media-panel">
            <div>
              <span className="admin-eyebrow">LOCAL MEDIA LIBRARY</span>
              <h3>Upload and organize files</h3>
              <p>Choose a file from your device. After upload, select it in the matching image or video field while editing a page. Images are resized automatically; videos are not changed.</p>
            </div>
            {canEditModule('media') && <label className="admin-upload-button">
              {uploading ? 'Uploading…' : 'Choose a photo or video'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" onChange={uploadMedia} disabled={uploading} />
            </label>}
            <div className="admin-assets">
              {assets.map((asset) => (
                <button key={`${asset.public_path}-${asset.id || asset.original_name}`} onClick={() => copyAssetPath(asset.public_path)}>
                  <span>{asset.media_type === 'video' ? '▶' : '▧'}</span>
                  <span><b>{asset.original_name}</b><small>{asset.public_path} · {(asset.size_bytes / 1024).toFixed(0)} KB</small></span>
                  <small>Copy file link</small>
                </button>
              ))}
              {!assets.length && <p>No uploaded files yet. Existing starter artwork is available at <code>/film-expo-hero.png</code>.</p>}
            </div>
          </div>
          </>}

          {activeView === 'enquiries' && canReadModule('enquiries') && <div className="admin-inquiries-panel">
            <div><span className="admin-eyebrow">EXHIBITOR ENQUIRIES</span><h3>People interested in exhibiting</h3><p>Read the messages sent through the exhibitor enquiry form. Contact them using the email or phone links.</p><strong className="admin-record-count">{inquiries.length} {inquiries.length === 1 ? 'enquiry' : 'enquiries'}</strong></div>
            {inquiries.length ? <div className="admin-inquiries-list">
              {inquiries.map((inquiry) => (
                <article key={inquiry.id}>
                  <div><strong>{inquiry.name}</strong><span>{inquiry.company} · {inquiry.interest}</span><small>{new Date(inquiry.created_at).toLocaleString()}</small></div>
                  <div><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a><a href={`tel:${inquiry.phone.replace(/[^\d+]/g, '')}`}>{inquiry.phone}</a></div>
                  {inquiry.message && <p>{inquiry.message}</p>}
                </article>
              ))}
            </div> : <p>No exhibitor enquiries have been received yet.</p>}
          </div>}

          {activeView === 'engagements' && canReadModule('engagements') && <div className="admin-inquiries-panel">
            <div>
              <span className="admin-eyebrow">REGISTRATIONS &amp; SUBSCRIBERS</span>
              <h3>Email submissions</h3>
              <p>See email addresses collected from registration requests and newsletter sign-ups. Download a spreadsheet if you need to sort or share the list.</p>
              <a className="admin-primary-button" href="/api/superadmin/engagements?format=csv">Download spreadsheet (CSV)</a>
              <strong className="admin-record-count">{engagements.length} {engagements.length === 1 ? 'record' : 'records'} shown · Latest 1,000</strong>
            </div>
            {engagements.length ? <div className="admin-inquiries-list">
              {engagements.map((engagement) => (
                <article key={engagement.id}>
                  <div>
                    <strong>{engagement.email}</strong>
                    <span>{engagement.engagement_type === 'newsletter' ? 'Newsletter' : 'Registration request'}</span>
                    <small>{new Date(engagement.created_at).toLocaleString()}</small>
                  </div>
                  <div>
                    <span>{engagement.is_active ? 'Active' : 'Inactive'}</span>
                    {engagement.marketing_consent_at && <small>Marketing consent: {new Date(engagement.marketing_consent_at).toLocaleDateString()}</small>}
                  </div>
                </article>
              ))}
            </div> : <p>No registrations or newsletter subscriptions have been received yet.</p>}
          </div>}
          {activeView === 'bookings' && canReadModule('bookings') && <div className="admin-inquiries-panel">
            <div className="admin-bookings-toolbar">
              <div>
                <span className="admin-eyebrow">PASS BOOKINGS</span>
                <h3>Who bought what</h3>
                <p>Filter ticket sales by state and city, see how many passes sold and how much was collected, and export the selection. Process a refund from here; refunded passes have their QR cancelled.</p>
              </div>
              <div className="admin-bookings-filters">
                <label>State
                  <select value={bookingFilter.state} onChange={(e) => applyBookingFilter({ state: e.target.value, city: '' })}>
                    <option value="">All states</option>
                    {bookingLocationOptions.map((loc) => <option key={loc.state} value={loc.state}>{loc.state}</option>)}
                  </select>
                </label>
                <label>City
                  <select value={bookingFilter.city} disabled={!bookingFilter.state} onChange={(e) => applyBookingFilter({ state: bookingFilter.state, city: e.target.value })}>
                    <option value="">{bookingFilter.state ? 'All cities' : 'Pick a state first'}</option>
                    {bookingCities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                {(bookingFilter.state || bookingFilter.city) && <button type="button" className="admin-booking-clear" onClick={() => applyBookingFilter({ state: '', city: '' })}>Clear filters</button>}
              </div>
            </div>

            {bookingsSummary && <div className="admin-bookings-summary">
              <div className="admin-booking-tile"><span>Tickets sold</span><strong>{bookingsSummary.ticketsSold}</strong></div>
              <div className="admin-booking-tile"><span>Gross collected</span><strong>₹{(bookingsSummary.grossPaise / 100).toLocaleString('en-IN')}</strong></div>
              <div className="admin-booking-tile"><span>Refunded</span><strong>₹{(bookingsSummary.refundedPaise / 100).toLocaleString('en-IN')}</strong></div>
              <div className="admin-booking-tile is-net"><span>Net collected</span><strong>₹{(bookingsSummary.netCollectedPaise / 100).toLocaleString('en-IN')}</strong></div>
            </div>}

            {bookingsSummary && bookingsSummary.byLocation.length > 1 && !bookingFilter.city && <div className="admin-bookings-bylocation">
              <span className="admin-eyebrow">COLLECTION BY LOCATION</span>
              {bookingsSummary.byLocation.map((loc) => (
                <button key={`${loc.state}-${loc.city}`} type="button" className="admin-bylocation-row" onClick={() => applyBookingFilter({ state: loc.state, city: loc.city })}>
                  <span>{loc.state}{loc.city ? ` · ${loc.city}` : ''}</span>
                  <span>{loc.ticketsSold} ticket{loc.ticketsSold === 1 ? '' : 's'}</span>
                  <strong>₹{(loc.netCollectedPaise / 100).toLocaleString('en-IN')}</strong>
                </button>
              ))}
            </div>}

            <div className="admin-bookings-exports">
              <a className="admin-primary-button" href={`/api/superadmin/bookings?format=xlsx${bookingExportQuery}`}>Download Excel (.xlsx)</a>
              <a className="admin-primary-button" href={`/api/superadmin/bookings?format=pdf${bookingExportQuery}`}>Download PDF report</a>
              <a className="admin-text-link" href={`/api/superadmin/bookings?format=csv${bookingExportQuery}`}>CSV</a>
              <strong className="admin-record-count">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'} shown</strong>
            </div>
            {bookings.length ? <div className="admin-inquiries-list admin-bookings-list">
              {bookings.map((booking) => {
                const refundable = booking.status === 'paid' && booking.refund_status === 'none' && Boolean(booking.razorpay_payment_id)
                return (
                  <article key={booking.id} className={`admin-booking-row status-${booking.status}${booking.refund_status === 'refunded' ? ' is-refunded' : ''}`}>
                    <div className="admin-booking-main">
                      <strong>{booking.buyer_name}</strong>
                      <span>{booking.quantity} × {booking.tier_name}</span>
                      <a href={`mailto:${booking.buyer_email}`}>{booking.buyer_email}</a>
                      {booking.buyer_phone && <span>{booking.buyer_phone}</span>}
                      {(booking.state || booking.city) && <span className="admin-booking-loc">{booking.state}{booking.city ? ` · ${booking.city}` : ''}</span>}
                      <small>{booking.ticket_ref ? `Ticket ${booking.ticket_ref}` : 'No ticket reference'}</small>
                    </div>
                    <div className="admin-booking-side">
                      <span className={`admin-booking-status is-${booking.status}`}>{booking.status}</span>
                      {booking.refund_status === 'refunded' && <span className="admin-booking-status is-refunded">refunded</span>}
                      <strong className="admin-booking-amount">₹{(booking.amount_paise / 100).toLocaleString('en-IN')}</strong>
                      <small>{new Date(booking.created_at).toLocaleString()}</small>
                      <small>{booking.razorpay_order_id || '—'}</small>
                      {canEditModule('bookings') && (refundable ? (
                        <button type="button" className="admin-booking-refund" onClick={() => adminRefund(booking)} disabled={refundingId === booking.id}>
                          {refundingId === booking.id ? 'Refunding…' : 'Refund'}
                        </button>
                      ) : booking.refund_status === 'refunded' ? (
                        <span className="admin-booking-refund-done">Refunded</span>
                      ) : null)}
                    </div>
                  </article>
                )
              })}
            </div> : <p>No pass bookings yet. They appear here once customers complete the ticket checkout.</p>}
          </div>}
          </>}
        </section>
      </div>
    </main>
  )
}
