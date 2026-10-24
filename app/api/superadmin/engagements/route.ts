import type { RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import { getAdminSession, hasAdminPermission } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'

export const runtime = 'nodejs'

type Engagement = RowDataPacket & {
  id: number
  engagement_type: 'registration' | 'newsletter'
  email: string
  is_active: number
  privacy_accepted_at: Date | null
  marketing_consent_at: Date | null
  created_at: Date
  updated_at: Date
}

function csvCell(value: string | number | Date | null) {
  const text = value instanceof Date ? value.toISOString() : value === null ? '' : String(value)
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!hasAdminPermission(session, 'engagements', 'read')) {
    return NextResponse.json({ error: 'This account cannot view registrations or subscribers.' }, { status: 403 })
  }

  const [rows] = await getPool().query<Engagement[]>(
    `SELECT id, engagement_type, email, is_active, privacy_accepted_at,
      marketing_consent_at, created_at, updated_at
     FROM email_engagements
     ORDER BY created_at DESC
     LIMIT 1000`,
  )

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const columns = ['type', 'email', 'active', 'privacy_accepted_at', 'marketing_consent_at', 'created_at', 'updated_at']
    const records = rows.map((row) => [
      row.engagement_type,
      row.email,
      row.is_active ? 'yes' : 'no',
      row.privacy_accepted_at,
      row.marketing_consent_at,
      row.created_at,
      row.updated_at,
    ].map(csvCell).join(','))
    return new Response([columns.map(csvCell).join(','), ...records].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="film-expo-email-engagements.csv"',
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({ engagements: rows }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
