import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-dynamic'

const supportedMedia = new Map([
  ['webp', 'image/webp'],
  ['mp4', 'video/mp4'],
  ['webm', 'video/webm'],
])

// Files are UUID-named and never change, so tag every byte stream with the
// filename as validator — a matching If-None-Match gets a free 304.
function etagFor(filename: string) {
  return `"${filename}"`
}

function notFound() {
  return new Response('Not found', { status: 404 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const match = /^([a-f0-9-]{36})\.(webp|mp4|webm)$/.exec(filename)
  if (!match) return notFound()

  const extension = match[2]
  const mimeType = supportedMedia.get(extension)
  if (!mimeType) return notFound()

  const filePath = path.join(process.cwd(), 'storage', 'uploads', filename)

  let fileSize: number
  try {
    fileSize = (await stat(filePath)).size
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return notFound()
    }
    throw error
  }

  const etag = etagFor(filename)
  const baseHeaders: Record<string, string> = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  }

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: baseHeaders })
  }

  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
    let start = rangeMatch?.[1] ? Number(rangeMatch[1]) : 0
    let end = rangeMatch?.[2] ? Number(rangeMatch[2]) : fileSize - 1

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, 'Content-Range': `bytes */${fileSize}` },
      })
    }
    end = Math.min(end, fileSize - 1)

    const stream = createReadStream(filePath, { start, end })
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': String(end - start + 1),
      },
    })
  }

  // Stream from disk instead of buffering: videos can be large, and under
  // heavy traffic buffering every request would exhaust memory.
  const stream = createReadStream(filePath)
  return new Response(stream as unknown as ReadableStream, {
    headers: { ...baseHeaders, 'Content-Length': String(fileSize) },
  })
}

// HEAD support so CDNs/probes can check the asset without downloading it.
export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const match = /^([a-f0-9-]{36})\.(webp|mp4|webm)$/.exec(filename)
  if (!match) return notFound()

  const filePath = path.join(process.cwd(), 'storage', 'uploads', filename)
  try {
    const size = (await stat(filePath)).size
    return new Response(null, {
      headers: {
        'Content-Type': supportedMedia.get(match[2]) ?? 'application/octet-stream',
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etagFor(filename),
      },
    })
  } catch {
    return notFound()
  }
}
