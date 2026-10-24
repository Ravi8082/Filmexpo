'use client'

type GalleryItem = {
  title: string
  category: string
  era: string
  date: string
  description: string
  image: string
  video?: string
}

type Asset = { public_path: string; original_name: string; media_type: 'image' | 'video' }
type Path = Array<string | number>

const eraOptions = [
  { key: 'past', label: 'Past' },
  { key: 'present', label: 'Present' },
  { key: 'future', label: 'Future' },
]

export function GalleryManager({
  items,
  categories,
  assets,
  uploadingPath,
  canReadMedia,
  canUploadMedia,
  onItemsChange,
  onUpload,
}: {
  items: GalleryItem[]
  categories: string[]
  assets: Asset[]
  uploadingPath: string | null
  canReadMedia: boolean
  canUploadMedia: boolean
  onItemsChange: (items: GalleryItem[]) => void
  onUpload: (file: File, path: Path, kind: 'image' | 'video') => void
}) {
  const patch = (index: number, changes: Partial<GalleryItem>) =>
    onItemsChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))

  const addItem = () => onItemsChange([{
    title: 'New gallery item',
    category: categories[0] ?? 'Highlights',
    era: 'present',
    date: '',
    description: '',
    image: '',
    video: '',
  }, ...items])

  const mediaField = (index: number, kind: 'image' | 'video', value: string) => {
    const options = assets.filter((asset) => asset.media_type === kind)
    const busy = uploadingPath === `items.${index}.${kind}`
    return (
      <div className="gm-media">
        <span>{kind === 'image' ? 'Photo / thumbnail' : 'Video (optional)'}</span>
        <input
          type="text"
          value={value}
          placeholder={kind === 'image' ? '/media/….webp or /film-expo-art/…' : '/media/….mp4'}
          onChange={(event) => patch(index, { [kind]: event.target.value })}
        />
        <select
          aria-label={`Choose uploaded ${kind}`}
          value=""
          onChange={(event) => event.target.value && patch(index, { [kind]: event.target.value })}
        >
          <option value="">Choose uploaded {kind}…</option>
          {options.map((asset) => <option key={asset.public_path} value={asset.public_path}>{asset.original_name}</option>)}
        </select>
        {!canReadMedia && <small className="admin-field-hint">To choose an uploaded file here, ask the Superadmin for “Photos and videos · View” access.</small>}
        {canUploadMedia
          ? <label className="admin-inline-upload">
            {busy ? 'Uploading…' : `Upload ${kind}`}
            <input
              type="file"
              disabled={uploadingPath !== null}
              accept={kind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'video/mp4,video/webm'}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) onUpload(file, ['items', index, kind], kind)
                event.currentTarget.value = ''
              }}
            />
          </label>
          : <small className="admin-field-hint">To upload a new file, ask the Superadmin for “Photos and videos · Make changes” access.</small>}
        {value && kind === 'video' && <button type="button" className="admin-remove-item" onClick={() => patch(index, { video: '' })}>Remove video</button>}
      </div>
    )
  }

  return (
    <div className="gm-root">
      <div className="gm-toolbar">
        <div><strong>Gallery photos and videos</strong><span>{items.length} items · Add a card for each photo or video visitors should see.</span></div>
        <button type="button" className="admin-add-item" onClick={addItem}>+ Add gallery item</button>
      </div>
      <div className="gm-list">
        {items.map((item, index) => (
          <article className="gm-card" key={index}>
            <div className="gm-preview">
              {item.video
                ? <video src={item.video} muted loop playsInline preload="metadata" controls />
                : item.image
                  ? <img src={item.image} alt="" />
                  : <span>No media</span>}
              <b className={`gm-badge gm-${item.era}`}>{item.era}</b>
            </div>
            <div className="gm-fields">
              <label className="admin-edit-field"><span>What should visitors see?</span><input type="text" value={item.title} onChange={(event) => patch(index, { title: event.target.value })} /></label>
              <div className="gm-row">
                <label className="admin-edit-field"><span>Time period</span>
                  <select value={item.era} onChange={(event) => patch(index, { era: event.target.value })}>
                    {eraOptions.map((era) => <option key={era.key} value={era.key}>{era.label}</option>)}
                  </select>
                </label>
                <label className="admin-edit-field"><span>Category</span>
                  <input type="text" list="gallery-categories" value={item.category} onChange={(event) => patch(index, { category: event.target.value })} />
                </label>
                <label className="admin-edit-field"><span>Date</span><input type="text" value={item.date} onChange={(event) => patch(index, { date: event.target.value })} /></label>
              </div>
              <label className="admin-edit-field"><span>Short description</span><textarea rows={2} value={item.description} onChange={(event) => patch(index, { description: event.target.value })} /></label>
              <div className="gm-row">
                {mediaField(index, 'image', item.image)}
                {mediaField(index, 'video', item.video ?? '')}
              </div>
              <button
                type="button"
                className="admin-remove-item"
                onClick={() => { if (window.confirm(`Delete "${item.title}"?`)) onItemsChange(items.filter((_, itemIndex) => itemIndex !== index)) }}
              >Delete item</button>
            </div>
          </article>
        ))}
        {!items.length && <p>No gallery items yet. Use “Add gallery item”.</p>}
      </div>
      <datalist id="gallery-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
    </div>
  )
}
