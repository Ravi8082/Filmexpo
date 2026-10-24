import { revalidatePath, revalidateTag } from 'next/cache'
import type { RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import { getAdminSession, hasAdminPermission, requestIsSameOrigin } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'
import { homepageContentDefaults, invalidateHomepageContentMemory, mergeContentDefaults } from '@/lib/site-content'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

type RangePair = readonly [startKey: string, endKey: string, message: string]

const DATE_RANGE_PAIRS: readonly RangePair[] = [
  ['startDate', 'endDate', 'End date cannot be before the start date.'],
  ['offerStart', 'offerEnd', 'Offer end date cannot be before the offer start date.'],
]

/** Walks the section JSON and reports the first start/end pair saved the wrong way round. */
function invalidRangeMessage(node: unknown, pairs: readonly RangePair[]): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const message = invalidRangeMessage(child, pairs)
      if (message) return message
    }
    return null
  }
  if (!node || typeof node !== 'object') return null
  const record = node as Record<string, unknown>
  for (const [startKey, endKey, message] of pairs) {
    const start = record[startKey]
    const end = record[endKey]
    if (typeof start === 'string' && typeof end === 'string'
      && ISO_DAY.test(start) && ISO_DAY.test(end) && end < start) {
      return message
    }
  }
  for (const value of Object.values(record)) {
    const message = invalidRangeMessage(value, pairs)
    if (message) return message
  }
  return null
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const canReadSection = (key: string) => hasAdminPermission(
    session,
    key === 'galleryPage' ? 'gallery' : key === 'blogPage' ? 'blog' : 'content',
    'read',
  )
  if (!Object.keys(homepageContentDefaults).some(canReadSection)) {
    return NextResponse.json({ error: 'No content sections are assigned to this account.' }, { status: 403 })
  }

  const [rows] = await getPool().query<Array<RowDataPacket & {
    section_key: string
    content_json: unknown
    is_visible: number
  }>>('SELECT section_key, content_json, is_visible FROM site_sections ORDER BY sort_order')

  const content = structuredClone(homepageContentDefaults) as Record<string, unknown>
  const hiddenSections: string[] = []

  for (const row of rows) {
    if (!Object.hasOwn(content, row.section_key) || !canReadSection(row.section_key)) {
      delete content[row.section_key]
      continue
    }
    const value = typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      content[row.section_key] = mergeContentDefaults(content[row.section_key], value)
    }
    if (!row.is_visible) hiddenSections.push(row.section_key)
  }
  for (const key of Object.keys(content)) {
    if (!canReadSection(key)) delete content[key]
  }

  return NextResponse.json({ content, hiddenSections })
}

export async function PUT(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object'
    || !('sectionKey' in body) || typeof body.sectionKey !== 'string'
    || !('content' in body) || !body.content || typeof body.content !== 'object' || Array.isArray(body.content)
    || !('isVisible' in body) || typeof body.isVisible !== 'boolean') {
    return NextResponse.json({ error: 'Invalid section data.' }, { status: 400 })
  }

  if (!Object.hasOwn(homepageContentDefaults, body.sectionKey)) {
    return NextResponse.json({ error: 'Unknown site section.' }, { status: 400 })
  }
  const permissionModule = body.sectionKey === 'galleryPage' ? 'gallery' : body.sectionKey === 'blogPage' ? 'blog' : 'content'
  if (!hasAdminPermission(session, permissionModule, 'edit')) {
    return NextResponse.json({ error: 'This account cannot edit that content section.' }, { status: 403 })
  }

  const serialized = JSON.stringify(body.content)
  if (Buffer.byteLength(serialized, 'utf8') > 200_000) {
    return NextResponse.json({ error: 'Section content exceeds the 200 KB limit.' }, { status: 413 })
  }

  const rangeError = invalidRangeMessage(body.content, DATE_RANGE_PAIRS)
  if (rangeError) {
    return NextResponse.json({ error: `${rangeError} Please correct it before saving.` }, { status: 400 })
  }

  const sortOrder = Object.keys(homepageContentDefaults).indexOf(body.sectionKey)
  await getPool().execute(
    `INSERT INTO site_sections (section_key, content_json, is_visible, sort_order)
     VALUES (?, CAST(? AS JSON), ?, ?)
     ON DUPLICATE KEY UPDATE content_json = VALUES(content_json), is_visible = VALUES(is_visible)`,
    [body.sectionKey, serialized, body.isVisible, sortOrder],
  )
  revalidateTag('film-expo-homepage', 'max')
  invalidateHomepageContentMemory()
  revalidatePath('/')
  revalidatePath('/about')
  revalidatePath('/exhibitors')
  revalidatePath('/conferences')
  revalidatePath('/gallery')
  revalidatePath('/blog')
  revalidatePath('/contact')
  revalidatePath('/privacy')
  revalidatePath('/terms')
  revalidatePath('/refund')
  revalidatePath('/blog/[slug]', 'page')

  return NextResponse.json({ success: true })
}
