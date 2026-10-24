import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import { getAdminSession, hasAdminPermission, requestIsSameOrigin } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!hasAdminPermission(session, 'media', 'read')) {
    return NextResponse.json({ error: 'This account cannot access the media library.' }, { status: 403 })
  }

  const [assets] = await getPool().query<Array<RowDataPacket & {
    id: number
    public_path: string
    original_name: string
    media_type: 'image' | 'video'
    mime_type: string
    size_bytes: number
    created_at: Date
  }>>(
    'SELECT id, public_path, original_name, media_type, mime_type, size_bytes, created_at FROM media_assets ORDER BY id DESC LIMIT 100',
  )
  return NextResponse.json({ assets })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!hasAdminPermission(session, 'media', 'edit')) {
    return NextResponse.json({ error: 'This account cannot upload media.' }, { status: 403 })
  }

  const length = Number(request.headers.get('content-length') || 0)
  if (length > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds the 50 MB upload limit.' }, { status: 413 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose an image or video to upload.' }, { status: 400 })
  }
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (imageTypes.includes(file.type) && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Images must be 12 MB or smaller.' }, { status: 413 })
  }
  if ((file.type === 'video/mp4' || file.type === 'video/webm') && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Videos must be 50 MB or smaller.' }, { status: 413 })
  }

  const source = Buffer.from(await file.arrayBuffer())
  const id = randomUUID()
  const uploadDirectory = path.join(process.cwd(), 'storage', 'uploads')
  await mkdir(uploadDirectory, { recursive: true })

  let publicPath: string
  let mediaType: 'image' | 'video'
  let mimeType: string
  let output = source

  if (imageTypes.includes(file.type)) {
    output = await sharp(source, { limitInputPixels: 80_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
    publicPath = `/media/${id}.webp`
    mediaType = 'image'
    mimeType = 'image/webp'
  } else if (file.type === 'video/mp4' || file.type === 'video/webm') {
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Videos must be 50 MB or smaller.' }, { status: 413 })
    }

    const isMp4 = file.type === 'video/mp4'
      && source.length > 12
      && source.toString('ascii', 4, 8) === 'ftyp'
    const isWebm = file.type === 'video/webm'
      && source.length > 4
      && source.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    if (!isMp4 && !isWebm) {
      return NextResponse.json({ error: 'The uploaded video is not a valid MP4 or WebM file.' }, { status: 415 })
    }

    const extension = isMp4 ? 'mp4' : 'webm'
    publicPath = `/media/${id}.${extension}`
    mediaType = 'video'
    mimeType = file.type
  } else {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, AVIF, MP4, and WebM files are supported.' }, { status: 415 })
  }

  const targetPath = path.join(uploadDirectory, path.basename(publicPath))
  await writeFile(targetPath, output, { flag: 'wx' })

  try {
    await getPool().execute(
      'INSERT INTO media_assets (public_path, original_name, media_type, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [publicPath, path.basename(file.name).slice(0, 255), mediaType, mimeType, output.byteLength],
    )
  } catch (error) {
    await unlink(targetPath)
    throw error
  }

  return NextResponse.json({
    asset: {
      publicPath,
      originalName: path.basename(file.name),
      mediaType,
      mimeType,
      sizeBytes: output.byteLength,
    },
  }, { status: 201 })
}
