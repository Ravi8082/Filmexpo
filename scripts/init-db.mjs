import nextEnv from '@next/env'
import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

nextEnv.loadEnvConfig(process.cwd())

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Set DATABASE_URL in .env.local before running pnpm db:init.')
}

const url = new URL(connectionString)
if (url.protocol !== 'mysql:') {
  throw new Error('DATABASE_URL must use the mysql:// protocol.')
}

const pool = mysql.createPool({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  connectionLimit: 2,
})

function mergeMissingDefaults(defaults, saved) {
  if (Array.isArray(defaults)) {
    if (!Array.isArray(saved)) return defaults
    return saved.map((item, index) => index < defaults.length
      ? mergeMissingDefaults(defaults[index], item)
      : item)
  }
  if (!defaults || typeof defaults !== 'object') return saved === undefined ? defaults : saved
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return saved === undefined ? defaults : saved

  const merged = { ...defaults, ...saved }
  for (const [key, value] of Object.entries(defaults)) {
    if (Object.hasOwn(saved, key)) merged[key] = mergeMissingDefaults(value, saved[key])
  }
  return merged
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(180) NOT NULL,
      role ENUM('superadmin', 'subadmin') NOT NULL DEFAULT 'subadmin',
      permissions_json JSON NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY admin_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_sections (
      section_key VARCHAR(80) NOT NULL PRIMARY KEY,
      content_json JSON NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      public_path VARCHAR(500) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      media_type ENUM('image', 'video') NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY media_assets_public_path (public_path)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exhibitor_inquiries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      company VARCHAR(180) NOT NULL,
      interest VARCHAR(80) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY exhibitor_inquiries_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_engagements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      engagement_type ENUM('registration', 'newsletter') NOT NULL,
      email VARCHAR(254) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      privacy_accepted_at DATETIME NOT NULL,
      marketing_consent_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY email_engagements_type_email (engagement_type, email),
      KEY email_engagements_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otp_rate_limits (
      rate_key CHAR(64) NOT NULL PRIMARY KEY,
      window_started_at DATETIME NOT NULL,
      request_count INT UNSIGNED NOT NULL DEFAULT 0,
      KEY email_otp_rate_limits_window (window_started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tier_id VARCHAR(60) NOT NULL,
      tier_name VARCHAR(120) NOT NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      amount_paise BIGINT UNSIGNED NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'INR',
      buyer_name VARCHAR(120) NOT NULL,
      buyer_email VARCHAR(254) NOT NULL,
      buyer_phone VARCHAR(40) NOT NULL,
      state VARCHAR(80) NOT NULL DEFAULT '',
      city VARCHAR(120) NOT NULL DEFAULT '',
      razorpay_order_id VARCHAR(80) NULL,
      razorpay_payment_id VARCHAR(80) NULL,
      ticket_ref VARCHAR(40) NULL,
      status ENUM('created', 'paid', 'failed') NOT NULL DEFAULT 'created',
      refund_status ENUM('none', 'refunded') NOT NULL DEFAULT 'none',
      razorpay_refund_id VARCHAR(80) NULL,
      refunded_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY bookings_order (razorpay_order_id),
      UNIQUE KEY bookings_ticket_ref (ticket_ref),
      KEY bookings_created_at (created_at),
      KEY bookings_email (buyer_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)

  const content = JSON.parse(
    await readFile(resolve(process.cwd(), 'lib', 'homepage-default.json'), 'utf8'),
  )

  for (const [order, [sectionKey, section]] of Object.entries(content).entries()) {
    await pool.execute(
      `INSERT IGNORE INTO site_sections (section_key, content_json, sort_order)
       VALUES (?, CAST(? AS JSON), ?)`,
      [sectionKey, JSON.stringify(section), order],
    )
    const [rows] = await pool.execute(
      'SELECT content_json FROM site_sections WHERE section_key = ?',
      [sectionKey],
    )
    const stored = typeof rows[0].content_json === 'string'
      ? JSON.parse(rows[0].content_json)
      : rows[0].content_json
    const merged = mergeMissingDefaults(section, stored)
    if (!isDeepStrictEqual(merged, stored)) {
      await pool.execute(
        'UPDATE site_sections SET content_json = CAST(? AS JSON) WHERE section_key = ?',
        [JSON.stringify(merged), sectionKey],
      )
    }
  }

  const [footerRows] = await pool.execute(
    'SELECT content_json FROM site_sections WHERE section_key = ?',
    ['footer'],
  )
  if (footerRows.length) {
    const storedFooter = typeof footerRows[0].content_json === 'string'
      ? JSON.parse(footerRows[0].content_json)
      : footerRows[0].content_json
    const migratedFooter = { ...storedFooter }
    if (migratedFooter.privacyHref === '#contact') migratedFooter.privacyHref = '/privacy'
    if (migratedFooter.termsHref === '#contact') migratedFooter.termsHref = '/terms'
    if (migratedFooter.sitemapHref === '#top') migratedFooter.sitemapHref = '/sitemap.xml'
    if (!isDeepStrictEqual(migratedFooter, storedFooter)) {
      await pool.execute(
        'UPDATE site_sections SET content_json = CAST(? AS JSON) WHERE section_key = ?',
        [JSON.stringify(migratedFooter), 'footer'],
      )
    }
  }

  const [conferenceRows] = await pool.execute(
    'SELECT content_json FROM site_sections WHERE section_key = ?',
    ['conferenceProgramme'],
  )
  if (conferenceRows.length) {
    const storedConference = typeof conferenceRows[0].content_json === 'string'
      ? JSON.parse(conferenceRows[0].content_json)
      : conferenceRows[0].content_json
    const previousSpeakerNames = new Map([
      ['Rahul Puri', 'Featured Speaker 01'],
      ['Zoya Akhtar', 'Featured Speaker 02'],
      ['Vikram Malhotra', 'Featured Speaker 03'],
      ['James Cameron (Virtual)', 'Featured Speaker 04'],
      ['Gaurav Gandhi', 'Featured Speaker 05'],
      ['Namit Malhotra', 'Featured Speaker 06'],
      ['Ritesh Sidhwani', 'Featured Speaker 07'],
      ['Jeremy Kleiner', 'Featured Speaker 08'],
      ['Guneet Monga', 'Featured Speaker 09'],
    ])
    let sampleGuestIndex = 9
    let conferenceChanged = false

    if (storedConference.hero?.eyebrow === 'CONFERENCE PROGRAMME') {
      storedConference.hero.eyebrow = content.conferenceProgramme.hero.eyebrow
      conferenceChanged = true
    }
    for (const day of storedConference.schedule?.days ?? []) {
      for (const track of day.tracks ?? []) {
        for (const session of track.sessions ?? []) {
          const replacement = previousSpeakerNames.get(session.speaker)
            ?? (session.speaker === 'Film Expo India Guest'
              ? `Featured Speaker ${String(++sampleGuestIndex).padStart(2, '0')}`
              : undefined)
          if (replacement) {
            session.speaker = replacement
            session.role = 'Sample speaker profile'
            conferenceChanged = true
          }
        }
      }
    }
    if (conferenceChanged) {
      await pool.execute(
        'UPDATE site_sections SET content_json = CAST(? AS JSON) WHERE section_key = ?',
        [JSON.stringify(storedConference), 'conferenceProgramme'],
      )
    }
  }

  const [heroRows] = await pool.execute(
    'SELECT content_json FROM site_sections WHERE section_key = ?',
    ['hero'],
  )
  if (heroRows.length) {
    const storedHero = typeof heroRows[0].content_json === 'string'
      ? JSON.parse(heroRows[0].content_json)
      : heroRows[0].content_json
    if (storedHero.dates === '12 – 14 March 2027'
      && storedHero.venue === 'Jio World Convention Centre'
      && storedHero.location === 'Mumbai, India') {
      await pool.execute(
        'UPDATE site_sections SET content_json = JSON_SET(content_json, ?, ?, ?, ?, ?, ?) WHERE section_key = ?',
        ['$.dates', content.hero.dates, '$.venue', content.hero.venue, '$.location', content.hero.location, 'hero'],
      )
    }
  }

  const [eventRows] = await pool.execute(
    'SELECT content_json FROM site_sections WHERE section_key = ?',
    ['event'],
  )
  if (eventRows.length) {
    const storedEvent = typeof eventRows[0].content_json === 'string'
      ? JSON.parse(eventRows[0].content_json)
      : eventRows[0].content_json
    const items = storedEvent.items
    const isLegacySchedule = Array.isArray(items)
      && items.length === 2
      && items[0].date === '12–14 March 2027'
      && items[0].venue === 'NESCO, Mumbai'
      && items[1].date === '27–29 August 2027'
      && items[1].venue === 'Bharat Mandapam, New Delhi'

    if (isLegacySchedule) {
      await pool.execute(
        `UPDATE site_sections
         SET content_json = JSON_SET(content_json, '$.items', CAST(? AS JSON), '$.dates', ?, '$.venue', ?, '$.location', ?)
         WHERE section_key = 'event'`,
        [
          JSON.stringify(content.event.items),
          content.event.dates,
          content.event.venue,
          content.event.location,
        ],
      )
    }
  }

  const [navigationRows] = await pool.execute(
    'SELECT content_json FROM site_sections WHERE section_key = ?',
    ['navigation'],
  )
  if (navigationRows.length) {
    const stored = typeof navigationRows[0].content_json === 'string'
      ? JSON.parse(navigationRows[0].content_json)
      : navigationRows[0].content_json
    let changed = false
    const items = stored.items.map((item) => {
      const label = item.label.toLowerCase()
      const nextLabel = label === 'exhibit' ? 'Exhibitors' : item.label
      const href = label === 'home'
        ? '/'
        : label === 'about'
          ? '/about'
          : label === 'conference' || label === 'conferences'
            ? '/conferences'
          : label === 'exhibit' || label === 'exhibitors'
            ? '/exhibitors'
            : item.href
      if (href === item.href && nextLabel === item.label) return item
      changed = true
      return { ...item, label: nextLabel, href }
    })

    if (changed) {
      await pool.execute(
        'UPDATE site_sections SET content_json = CAST(? AS JSON) WHERE section_key = ?',
        [JSON.stringify({ ...stored, items }), 'navigation'],
      )
    }
    if (!items.some((item) => ['conference', 'conferences'].includes(item.label.toLowerCase()))) {
      items.push({ label: 'Conferences', href: '/conferences' })
      await pool.execute(
        `UPDATE site_sections SET content_json = JSON_SET(content_json, '$.items', CAST(? AS JSON)) WHERE section_key = ?`,
        [JSON.stringify(items), 'navigation'],
      )
    }
    if (!items.some((item) => item.label.toLowerCase() === 'gallery')) {
      items.push({ label: 'Gallery', href: '/gallery' })
      await pool.execute(
        `UPDATE site_sections SET content_json = JSON_SET(content_json, '$.items', CAST(? AS JSON)) WHERE section_key = ?`,
        [JSON.stringify(items), 'navigation'],
      )
    }
    if (!items.some((item) => ['blog', 'blogs'].includes(item.label.toLowerCase()))) {
      items.push({ label: 'Blog', href: '/blog' })
      await pool.execute(
        `UPDATE site_sections SET content_json = JSON_SET(content_json, '$.items', CAST(? AS JSON)) WHERE section_key = ?`,
        [JSON.stringify(items), 'navigation'],
      )
    }
    const contactItem = items.find((item) => item.label.toLowerCase() === 'contact')
    if (contactItem && contactItem.href !== '/contact') {
      contactItem.href = '/contact'
      await pool.execute(
        `UPDATE site_sections SET content_json = JSON_SET(content_json, '$.items', CAST(? AS JSON)) WHERE section_key = ?`,
        [JSON.stringify(items), 'navigation'],
      )
    }
  }

  await pool.execute(
    `UPDATE site_sections
     SET content_json = JSON_SET(content_json, '$.socialLinks', CAST(? AS JSON))
     WHERE section_key = 'footer'
       AND JSON_TYPE(JSON_EXTRACT(content_json, '$.socialLinks[0]')) = 'STRING'`,
    [JSON.stringify(content.footer.socialLinks)],
  )

  console.log('Film Expo CMS tables are ready and default sections are seeded.')
} finally {
  await pool.end()
}
