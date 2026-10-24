'use client'

type Post = {
  slug: string
  title: string
  category: string
  author: string
  date: string
  featured: boolean
  excerpt: string
  body: string
  image: string
  video?: string
}

type Asset = { public_path: string; original_name: string; media_type: 'image' | 'video' }
type Path = Array<string | number>

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export function BlogManager({
  posts,
  categories,
  assets,
  uploadingPath,
  canReadMedia,
  canUploadMedia,
  onPostsChange,
  onUpload,
}: {
  posts: Post[]
  categories: string[]
  assets: Asset[]
  uploadingPath: string | null
  canReadMedia: boolean
  canUploadMedia: boolean
  onPostsChange: (posts: Post[]) => void
  onUpload: (file: File, path: Path, kind: 'image' | 'video') => void
}) {
  const patch = (index: number, changes: Partial<Post>) =>
    onPostsChange(posts.map((post, postIndex) => postIndex === index ? { ...post, ...changes } : post))

  const setFeatured = (index: number, featured: boolean) =>
    onPostsChange(posts.map((post, postIndex) => ({ ...post, featured: featured && postIndex === index })))

  const addPost = () => {
    const stamp = Date.now().toString(36)
    onPostsChange([{
      slug: `new-post-${stamp}`,
      title: 'New blog post',
      category: categories[0] ?? 'Industry Insights',
      author: '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      featured: false,
      excerpt: '',
      body: '',
      image: '',
      video: '',
    }, ...posts])
  }

  const mediaField = (index: number, kind: 'image' | 'video', value: string) => {
    const options = assets.filter((asset) => asset.media_type === kind)
    const busy = uploadingPath === `posts.${index}.${kind}`
    return (
      <div className="gm-media">
        <span>{kind === 'image' ? 'Cover image' : 'Video (optional)'}</span>
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
                if (file) onUpload(file, ['posts', index, kind], kind)
                event.currentTarget.value = ''
              }}
            />
          </label>
          : <small className="admin-field-hint">To upload a new file, ask the Superadmin for “Photos and videos · Make changes” access.</small>}
        {value && <button type="button" className="admin-remove-item" onClick={() => patch(index, { [kind]: '' })}>Remove {kind}</button>}
      </div>
    )
  }

  return (
    <div className="gm-root">
      <div className="gm-toolbar">
        <div><strong>News and articles</strong><span>{posts.length} posts · Add a post to publish a new story on the Blog page.</span></div>
        <button type="button" className="admin-add-item" onClick={addPost}>+ Write a new post</button>
      </div>
      <div className="gm-list">
        {posts.map((post, index) => (
          <article className="gm-card" key={index}>
            <div className="gm-preview">
              {post.video
                ? <video src={post.video} muted loop playsInline preload="metadata" controls />
                : post.image
                  ? <img src={post.image} alt="" />
                  : <span>No media</span>}
              {post.featured && <b className="gm-badge gm-present">featured</b>}
            </div>
            <div className="gm-fields">
              <label className="admin-edit-field"><span>Article headline</span><input type="text" value={post.title} onChange={(event) => patch(index, { title: event.target.value })} /></label>
              <div className="gm-row">
                <label className="admin-edit-field"><span>Category</span>
                  <input type="text" list="blog-categories" value={post.category} onChange={(event) => patch(index, { category: event.target.value })} />
                </label>
              </div>
              <div className="gm-row">
                <label className="admin-edit-field"><span>Author</span><input type="text" value={post.author} onChange={(event) => patch(index, { author: event.target.value })} /></label>
                <label className="admin-edit-field"><span>Date</span><input type="text" value={post.date} onChange={(event) => patch(index, { date: event.target.value })} /></label>
              </div>
              <label className="admin-boolean-field"><input type="checkbox" checked={Boolean(post.featured)} onChange={(event) => setFeatured(index, event.target.checked)} />Featured story (shown big at the top)</label>
              <label className="admin-edit-field"><span>Short summary shown on the Blog page</span><textarea rows={2} value={post.excerpt} onChange={(event) => patch(index, { excerpt: event.target.value })} /></label>
              <label className="admin-edit-field"><span>Article text</span><textarea rows={8} value={post.body} onChange={(event) => patch(index, { body: event.target.value })} /><small className="admin-field-hint">Write normally. Leave a blank line between paragraphs. For a small heading, start a new line with “## ”.</small></label>
              <details className="gm-more-options"><summary>More options: article link</summary><label className="admin-edit-field"><span>Short link name (for advanced use)</span><input type="text" value={post.slug} onChange={(event) => patch(index, { slug: slugify(event.target.value) })} /><small className="admin-field-hint">This becomes the end of the article address. Leave it as-is if you are unsure.</small></label></details>
              <div className="gm-row">
                {mediaField(index, 'image', post.image)}
                {mediaField(index, 'video', post.video ?? '')}
              </div>
              <button
                type="button"
                className="admin-remove-item"
                onClick={() => { if (window.confirm(`Delete "${post.title}"?`)) onPostsChange(posts.filter((_, postIndex) => postIndex !== index)) }}
              >Delete post</button>
            </div>
          </article>
        ))}
        {!posts.length && <p>No articles yet. Use “Write a new post”.</p>}
      </div>
      <datalist id="blog-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
    </div>
  )
}
