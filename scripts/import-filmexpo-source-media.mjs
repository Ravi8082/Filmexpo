import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const manifestPath = path.join(root, 'scripts', 'filmexpo-source-media-manifest.json')
const source = JSON.parse(await readFile(manifestPath, 'utf8'))
const outputDirectory = path.join(root, 'public', 'filmexpo-live')
const assets = [
  ...(source.hero ? [{ ...source.hero, kind: 'hero' }] : []),
  ...(source.mentor ? [{ ...source.mentor, kind: 'mentor' }] : []),
  ...source.partners.map((item) => ({ ...item, kind: 'partner' })),
  ...source.gallery.map((item) => ({ ...item, kind: 'gallery' })),
]

if (!source.sourceUrl || !Array.isArray(source.partners) || !Array.isArray(source.gallery)) {
  throw new Error('Source manifest must contain sourceUrl, partners and gallery.')
}

async function download(item, index) {
  const url = new URL(item.url)
  if (url.hostname !== 'filmexpoindia.com' || !url.pathname.startsWith('/wp-content/uploads/')) {
    throw new Error(`Refusing media outside the official Film Expo India uploads: ${item.url}`)
  }

  const folder = item.kind === 'gallery'
    ? 'gallery'
    : item.kind === 'partner'
      ? 'partners'
      : item.kind === 'mentor'
        ? 'speakers'
        : 'hero'
  const base = item.kind === 'gallery'
    ? `moment-${String(index - (source.hero ? 1 : 0) - source.partners.length + 1).padStart(3, '0')}`
    : item.kind === 'partner'
      ? `partner-${String(index - (source.hero ? 1 : 0) + 1).padStart(3, '0')}`
      : item.kind === 'mentor'
        ? 'vindu-dara-singh'
        : 'film-expo-2026'
  const relativePath = `/filmexpo-live/${folder}/${base}.webp`
  const destination = path.join(outputDirectory, folder, `${base}.webp`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${item.url}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > 20 * 1024 * 1024) {
    throw new Error(`Unexpected source media size (${bytes.length} bytes): ${item.url}`)
  }

  const image = sharp(bytes, { limitInputPixels: 80_000_000 })
  const metadata = await image.metadata()
  const width = item.kind === 'partner' ? 700 : item.kind === 'hero' ? 1800 : item.kind === 'mentor' ? 1000 : 1400
  await mkdir(path.dirname(destination), { recursive: true })
  await image
    .rotate()
    .resize(item.kind === 'partner'
      ? { width, height: width, fit: 'inside', withoutEnlargement: true }
      : { width, withoutEnlargement: true })
    .webp({ quality: item.kind === 'partner' ? 82 : 76, effort: 5 })
    .toFile(destination)

  return {
    ...item,
    image: relativePath,
    sourceUrl: item.url,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    kind: item.kind,
  }
}

const completed = new Array(assets.length)
let nextIndex = 0
async function worker() {
  while (nextIndex < assets.length) {
    const index = nextIndex++
    completed[index] = await download(assets[index], index)
  }
}

await Promise.all(Array.from({ length: Math.min(6, assets.length) }, () => worker()))

const hero = completed.find((item) => item.kind === 'hero')
const mentor = completed.find((item) => item.kind === 'mentor')
const partners = completed.filter((item) => item.kind === 'partner')
const gallery = completed.filter((item) => item.kind === 'gallery').map((item, index) => ({
  title: `Film Expo India 2026 — Moment ${String(index + 1).padStart(3, '0')}`,
  category: 'Highlights',
  era: 'present',
  date: '2026',
  description: 'A moment from the Film Expo India 2026 official photo gallery.',
  image: item.image,
  sourceUrl: item.sourceUrl,
}))

const imported = {
  sourceUrl: source.sourceUrl,
  gallerySourceUrl: source.gallerySourceUrl,
  capturedAt: source.capturedAt,
  officialVideoChannel: source.officialVideoChannel,
  hero,
  mentor,
  partners,
  gallery,
}

await writeFile(
  path.join(root, 'lib', 'filmexpo-live-media.json'),
  `${JSON.stringify(imported, null, 2)}\n`,
)

const totalBytes = (await Promise.all(completed.map(async (item) => {
  const filePath = path.join(root, 'public', item.image.slice(1))
  return (await stat(filePath)).size
}))).reduce((sum, size) => sum + size, 0)

console.log(`Imported ${partners.length} partner logos and ${gallery.length} gallery photos.`)
console.log(`Optimized media total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`)
