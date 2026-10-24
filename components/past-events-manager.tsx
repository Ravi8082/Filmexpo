'use client'

import Image from 'next/image'
import type { HomepageContent } from '@/lib/site-content'

type PastEvent = HomepageContent['pastEvents']['items'][number]
type Asset = { public_path: string; original_name: string; media_type: 'image' | 'video' }
type Path = Array<string | number>

export function PastEventsManager({
  items,
  assets,
  uploadingPath,
  canUploadMedia,
  onItemsChange,
  onUpload,
}: {
  items: PastEvent[]
  assets: Asset[]
  uploadingPath: string | null
  canUploadMedia: boolean
  onItemsChange: (items: PastEvent[]) => void
  onUpload: (file: File, path: Path, kind: 'image' | 'video') => void
}) {
  const patch = (index: number, changes: Partial<PastEvent>) => {
    onItemsChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))
  }

  const addItem = () => onItemsChange([
    ...items,
    { title: 'New event highlight', date: '', location: '', video: '', poster: '' },
  ])

  const mediaField = (index: number, kind: 'video' | 'image', value: string) => {
    const label = kind === 'video' ? 'Event video' : 'Poster / thumbnail'
    const mediaType = kind === 'video' ? 'video' : 'image'
    const options = assets.filter((asset) => asset.media_type === mediaType)
    const path = `items.${index}.${kind}`
    const busy = uploadingPath === path

    return (
      <div className="pe-admin-media-field">
        <label className="admin-edit-field">
          <span>{label}</span>
          <input
            type="text"
            value={value}
            placeholder={kind === 'video' ? 'Upload a video or paste its /media/ path' : 'Upload an image or paste its path'}
            onChange={(event) => patch(index, { [kind === 'video' ? 'video' : 'poster']: event.target.value })}
          />
        </label>
        {options.length > 0 && <label className="admin-edit-field">
          <span>Choose from media library</span>
          <select value="" aria-label={`Choose uploaded ${mediaType} for ${label}`} onChange={(event) => {
            if (event.target.value) patch(index, { [kind === 'video' ? 'video' : 'poster']: event.target.value })
          }}>
            <option value="">Select uploaded {mediaType}…</option>
            {options.map((asset) => <option key={asset.public_path} value={asset.public_path}>{asset.original_name}</option>)}
          </select>
        </label>}
        {canUploadMedia
          ? <label className="admin-inline-upload pe-admin-upload">
            {busy ? 'Uploading…' : `Upload ${kind}`}
            <input
              type="file"
              accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif'}
              disabled={uploadingPath !== null}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) onUpload(file, ['items', index, kind === 'video' ? 'video' : 'poster'], kind)
                event.currentTarget.value = ''
              }}
            />
          </label>
          : <small className="pe-admin-permission-note">Ask a superadmin for media upload access.</small>}
        {value && <a className="pe-admin-media-link" href={value} target="_blank" rel="noreferrer">Open selected {mediaType} ↗</a>}
      </div>
    )
  }

  return (
    <section className="pe-admin-manager" aria-label="Past event videos">
      <div className="pe-admin-toolbar">
        <div><strong>Past event videos</strong><span>{items.length} event{items.length === 1 ? '' : 's'}</span></div>
        <button type="button" className="admin-add-item" onClick={addItem}>+ Add event</button>
      </div>
      <p className="admin-help">Upload an MP4 or WebM video (up to 50 MB) for each event. The poster image is shown before playback; visitors can open the event card to watch the video.</p>
      <div className="pe-admin-list">
        {items.map((item, index) => (
          <article className="pe-admin-card" key={`${item.title}-${index}`}>
            <div className="pe-admin-preview">
              {item.video
                ? <video src={item.video} poster={item.poster || undefined} controls preload="metadata" />
                : item.poster
                  ? <Image src={item.poster} alt="" fill sizes="(max-width: 700px) 100vw, 320px" />
                  : <span>Upload a video or poster to preview this event</span>}
            </div>
            <div className="pe-admin-fields">
              <div className="pe-admin-text-fields">
                <label className="admin-edit-field"><span>Event title</span><input type="text" value={item.title} onChange={(event) => patch(index, { title: event.target.value })} /></label>
                <label className="admin-edit-field"><span>Date</span><input type="text" value={item.date} onChange={(event) => patch(index, { date: event.target.value })} /></label>
                <label className="admin-edit-field"><span>Location</span><input type="text" value={item.location} onChange={(event) => patch(index, { location: event.target.value })} /></label>
              </div>
              <div className="pe-admin-media-grid">
                {mediaField(index, 'video', item.video ?? '')}
                {mediaField(index, 'image', item.poster ?? '')}
              </div>
              <button type="button" className="admin-remove-item" onClick={() => {
                if (window.confirm(`Remove "${item.title}" from past events?`)) {
                  onItemsChange(items.filter((_, itemIndex) => itemIndex !== index))
                }
              }}>Remove event</button>
            </div>
          </article>
        ))}
        {!items.length && <p className="admin-help">No past events yet. Add an event to upload its video and poster.</p>}
      </div>
    </section>
  )
}
