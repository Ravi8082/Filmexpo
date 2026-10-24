import nextEnv from '@next/env'
import mysql from 'mysql2/promise'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

nextEnv.loadEnvConfig(process.cwd())

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Set DATABASE_URL in .env.local before seeding generated artwork.')
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

const artworkDirectory = path.resolve(process.cwd(), 'public', 'film-expo-art')
const publicPath = (filename) => `/film-expo-art/${filename}.svg`

async function readSection(sectionKey) {
  const [rows] = await pool.execute('SELECT content_json FROM site_sections WHERE section_key = ?', [sectionKey])
  if (!rows.length) {
    throw new Error(`Homepage section "${sectionKey}" is missing. Run pnpm db:init first.`)
  }
  const value = rows[0].content_json
  return typeof value === 'string' ? JSON.parse(value) : value
}

async function updateSection(sectionKey, content) {
  await pool.execute(
    'UPDATE site_sections SET content_json = CAST(? AS JSON) WHERE section_key = ?',
    [JSON.stringify(content), sectionKey],
  )
}

function updateItemImages(items, imagePaths, field = 'image') {
  if (!Array.isArray(items)) {
    throw new Error('Expected a homepage content list while assigning artwork.')
  }
  return items.map((item, index) => (
    imagePaths[index] ? { ...item, [field]: imagePaths[index] } : item
  ))
}

try {
  const filenames = (await readdir(artworkDirectory))
    .filter((filename) => /^[a-z0-9-]+\.svg$/.test(filename))

  if (filenames.length !== 40) {
    throw new Error(`Expected 40 generated SVG artworks but found ${filenames.length}. Run pnpm artwork:generate first.`)
  }

  for (const filename of filenames) {
    const filePath = path.join(artworkDirectory, filename)
    const fileStats = await stat(filePath)
    await pool.execute(
      `INSERT INTO media_assets (public_path, original_name, media_type, mime_type, size_bytes)
       VALUES (?, ?, 'image', 'image/svg+xml', ?)
       ON DUPLICATE KEY UPDATE
         original_name = VALUES(original_name),
         media_type = VALUES(media_type),
         mime_type = VALUES(mime_type),
         size_bytes = VALUES(size_bytes)`,
      [`/film-expo-art/${filename}`, filename, fileStats.size],
    )
  }

  const [hero, features, event, highlights, categories, speakers, partners, gallery, news, closing] = await Promise.all([
    readSection('hero'),
    readSection('features'),
    readSection('event'),
    readSection('highlights'),
    readSection('categories'),
    readSection('speakers'),
    readSection('partners'),
    readSection('gallery'),
    readSection('news'),
    readSection('closing'),
  ])

  hero.image = publicPath('hero-expo')
  features.items = updateItemImages(features.items, [
    publicPath('exhibit'),
    publicPath('visit'),
    publicPath('film-submission'),
    publicPath('sponsorship'),
    publicPath('conference'),
  ])
  event.image = publicPath('venue')
  highlights.image = publicPath('highlights')
  categories.items = updateItemImages(categories.items, [
    publicPath('production'),
    publicPath('post-production'),
    publicPath('content-ip'),
    publicPath('streaming'),
    publicPath('animation-gaming'),
    publicPath('film-tourism'),
  ])
  speakers.eyebrow = 'ILLUSTRATED SPEAKER CONCEPTS'
  speakers.title = 'Placeholder Portraits for Future Speakers'
  speakers.items = updateItemImages(speakers.items, Array.from(
    { length: 5 },
    (_, index) => publicPath(`speaker-${index + 1}`),
  )).map((speaker, index) => ({
    ...speaker,
    ...(speaker.name === 'Industry Speaker' || speaker.name === 'Featured Speaker'
      ? { name: `Speaker Placeholder ${index + 1}` }
      : {}),
    ...(speaker.organization === 'Film & Media' || speaker.organization?.toLowerCase().includes('placeholder')
      ? { organization: 'Illustrated portrait placeholder' }
      : {}),
  }))
  partners.eyebrow = 'SAMPLE PARTNER CONCEPTS'
  partners.title = 'Illustrative Logo Placeholders — Replace with Confirmed Partners'
  partners.items = [
    ['Cinema Tech', '01'],
    ['Camera Gear', '02'],
    ['Studio Partner', '03'],
    ['Media Partner', '04'],
    ['Lighting Lab', '05'],
    ['Post House', '06'],
    ['Frame Works', '07'],
    ['Pixel Union', '08'],
    ['Sound Stage', '09'],
    ['Film Craft', '10'],
    ['Creator Hub', '11'],
    ['Screen Guild', '12'],
  ].map(([name, number]) => ({
    name,
    logo: publicPath(`partner-${number}`),
  }))
  gallery.eyebrow = 'ILLUSTRATED EVENT GALLERY'
  gallery.title = 'Concept Art for Film Expo India'
  gallery.items = updateItemImages(gallery.items, Array.from(
    { length: 5 },
    (_, index) => publicPath(`gallery-${index + 1}`),
  )).map((item) => ({
    ...item,
    alt: `Illustration: ${item.alt.replace(/^Illustration:\s*/i, '')}`,
  }))
  news.items = updateItemImages(news.items, Array.from(
    { length: 3 },
    (_, index) => publicPath(`news-${index + 1}`),
  ))
  closing.image = publicPath('closing')

  for (const [sectionKey, content] of [
    ['hero', hero],
    ['features', features],
    ['event', event],
    ['highlights', highlights],
    ['categories', categories],
    ['speakers', speakers],
    ['partners', partners],
    ['gallery', gallery],
    ['news', news],
    ['closing', closing],
  ]) {
    await updateSection(sectionKey, content)
  }

  console.log(`Registered ${filenames.length} SVG artworks and updated 10 homepage sections. Image files remain outside MySQL; only paths and metadata are stored there.`)
} finally {
  await pool.end()
}
