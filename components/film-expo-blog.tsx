'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Menu, MessageCircle, Play, Share2, User, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { EmailEngagementForm } from '@/components/email-engagement-form'
import { tiltHandlers } from '@/lib/tilt'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

type Post = HomepageContent['blogPage']['posts'][number] & { video?: string }

function safeHref(href: string) {
  if (!href || href.startsWith('#')) return ''
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:')) return href
  return ''
}

function navigationHref(label: string, href: string) {
  const normalized = label.toLowerCase()
  if (normalized === 'home') return '/'
  if (normalized === 'about') return '/about'
  if (normalized === 'exhibit' || normalized === 'exhibitors') return '/exhibitors'
  if (normalized === 'conference' || normalized === 'conferences') return '/conferences'
  if (normalized === 'gallery') return '/gallery'
  if (normalized === 'blog' || normalized === 'blogs') return '/blog'
  return safeHref(href)
}

function Split({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <span className="gp-split" aria-label={text}>
      {text.split(' ').map((word, index) => (
        <span className="gp-word" aria-hidden="true" key={`${word}-${index}`}>
          <span style={{ ['--w' as string]: index + start }}>{word}&nbsp;</span>
        </span>
      ))}
    </span>
  )
}

function Cover({ post, sizes, priority }: { post: Post; sizes: string; priority?: boolean }) {
  if (post.image) {
    return <Image src={post.image} alt={post.title} fill sizes={sizes} priority={priority} unoptimized={post.image.endsWith('.svg')} />
  }
  if (post.video) return <video src={post.video} muted playsInline preload="metadata" />
  return <span className="bp-nomedia">No media</span>
}

function postHref(post: Post) {
  return `/blog/${encodeURIComponent(post.slug)}`
}

export function FilmExpoBlog({
  content,
  hiddenSections,
  slug,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
  slug?: string
}) {
  const page = content.blogPage
  const posts = page.posts as Post[]
  const isVisible = (section: ContentSectionKey) => !hiddenSections.includes(section)
  const perPage = Math.max(1, Number(page.perPage) || 6)

  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState('All')
  const [pageIndex, setPageIndex] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)

  const article = slug ? posts.find((post) => post.slug === slug) : undefined
  const featuredPost = posts.find((post) => post.featured) ?? posts[0]
  const categories = useMemo(() => {
    const fromPosts = posts.map((post) => post.category).filter(Boolean)
    return ['All', ...Array.from(new Set([...page.categories, ...fromPosts]))]
  }, [posts, page.categories])
  const filtered = useMemo(
    () => posts.filter((post) => (category === 'All' || post.category === category) && (category !== 'All' || post !== featuredPost || posts.length === 1)),
    [posts, category, featuredPost],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visiblePosts = filtered.slice((pageIndex - 1) * perPage, pageIndex * perPage)
  const related = article ? posts.filter((post) => post.slug !== article.slug).slice(0, 3) : []

  useEffect(() => { setPageIndex(1) }, [category])

  useScrollReveal('.gp-reveal', [category, pageIndex, slug])

  function moveHero(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 2}`)
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 2}`)
  }

  function resetHero(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--pointer-x', '0')
    event.currentTarget.style.setProperty('--pointer-y', '0')
  }

  function goToPage(next: number) {
    setPageIndex(next)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const meta = (post: Post) => (
    <span className="bp-meta">
      {post.author && <span><User size={12} />{post.author}</span>}
      {post.date && <span><CalendarDays size={12} />{post.date}</span>}
    </span>
  )

  const renderBody = (body: string) => body.split(/\n{2,}/).filter(Boolean).map((block, index) => (
    block.startsWith('## ')
      ? <h2 key={index}>{block.slice(3)}</h2>
      : <p key={index} className="gp-reveal" style={{ ['--i' as string]: Math.min(index, 6) }}>{block}</p>
  ))

  return (
    <main className="film-site gallery-page blog-page">
      <header className="site-header">
        <a hidden={!isVisible('brand')} href="/" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav hidden={!isVisible('navigation')} className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={['blog', 'blogs'].includes(item.label.toLowerCase()) ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
          ))}
        </nav>
        <a hidden={!isVisible('navigation')} className="header-cta" href="/?register=1">{content.navigation.registerLabel}<ArrowRight size={14} /></a>
        <button hidden={!isVisible('navigation')} className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && isVisible('navigation') && (
        <nav className="mobile-nav about-mobile-nav gp-mobile-nav" aria-label="Mobile navigation">
          {content.navigation.items.map((item, index) => (
            <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={16} /></a>
          ))}
        </nav>
      )}

      {article ? (
        <>
          <section className="gp-hero bp-article-hero" onPointerMove={moveHero} onPointerLeave={resetHero}>
            {article.image && <Image className="gp-hero-image" src={article.image} alt="" fill priority sizes="100vw" unoptimized={article.image.endsWith('.svg')} />}
            <div className="gp-hero-shade" />
            <div className="gp-hero-grid" aria-hidden="true" />
            <div className="gp-3d" aria-hidden="true">
              <div className="gp-reel gp-reel-left"><b /><b /><b /><b /><b /><b /></div>
              <div className="gp-reel gp-reel-right"><b /><b /><b /><b /><b /><b /></div>
            </div>
            <div className="gp-hero-copy">
              <p className="gp-breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/blog">{page.hero.breadcrumb}</a> <span>›</span> {article.category}</p>
              <span className="bp-badge">{article.category}</span>
              <h1 className="bp-article-title">{article.title}</h1>
              {meta(article)}
            </div>
          </section>

          <article className="bp-article">
            {article.video && (
              <div className="bp-article-video gp-reveal">
                <video src={article.video} poster={article.image || undefined} controls playsInline />
              </div>
            )}
            <p className="bp-lead gp-reveal">{article.excerpt}</p>
            <div className="bp-body">{renderBody(article.body)}</div>
            <div className="bp-share gp-reveal">
              <span><Share2 size={13} />SHARE</span>
              <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${article.title} — ${window.location.href}`)}`, '_blank', 'noopener,noreferrer')}><MessageCircle size={14} />WhatsApp</button>
              <button type="button" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}>X / Twitter</button>
              <button type="button" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}>LinkedIn</button>
            </div>
            <a className="bp-back" href="/blog"><ArrowLeft size={15} />{page.backLabel}</a>
          </article>

          {related.length > 0 && (
            <section className="bp-related gp-reveal">
              <h2><Split text={page.relatedTitle} /></h2>
              <div className="bp-related-grid">
                {related.map((post, index) => (
                  <a key={post.slug} className="bp-card bp-card-compact tilt-3d" {...tiltHandlers} href={postHref(post)} style={{ ['--i' as string]: index } as React.CSSProperties}>
                    <div className="bp-thumb"><Cover post={post} sizes="(max-width: 800px) 90vw, 30vw" /></div>
                    <div className="bp-card-copy">
                      <span className="bp-badge">{post.category}</span>
                      <h3>{post.title}</h3>
                      {meta(post)}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="gp-hero" onPointerMove={moveHero} onPointerLeave={resetHero}>
            <HeroMedia className="gp-hero-image" videoClassName="gp-hero-video" image={page.hero.image} video={page.hero.video} priority />
            <div className="gp-hero-shade" />
            <div className="gp-hero-grid" aria-hidden="true" />
            <div className="gp-3d" aria-hidden="true">
              <div className="gp-reel gp-reel-left"><b /><b /><b /><b /><b /><b /></div>
              <div className="gp-reel gp-reel-right"><b /><b /><b /><b /><b /><b /></div>
              <div className="gp-film-strip"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="gp-hero-copy">
              <p className="eyebrow gp-eyebrow">{page.hero.eyebrow}</p>
              <h1 className="gp-hero-title">
                <span className="hero-title-line">{page.hero.title}</span>
                <span className="hero-title-line hero-title-highlight"><em>{page.hero.highlight}</em></span>
              </h1>
              <p className="bp-hero-desc">{page.hero.description}</p>
              <p className="gp-breadcrumb"><a href="/">Home</a> <span>›</span> {page.hero.breadcrumb}</p>
            </div>
          </section>

          {featuredPost && (
            <section className="bp-featured-band gp-reveal">
              <a className="bp-feature tilt-3d" {...tiltHandlers} href={postHref(featuredPost)}>
                <div className="bp-feature-media"><Cover post={featuredPost} sizes="100vw" priority />{featuredPost.video && <i className="bp-play"><Play size={20} fill="currentColor" /></i>}</div>
                <div className="bp-feature-shade" />
                <div className="bp-feature-copy">
                  <span className="bp-badge bp-badge-gold">{page.featuredLabel}</span>
                  <span className="bp-chip-line"><b>{featuredPost.category}</b>{featuredPost.date}</span>
                  <h2>{featuredPost.title}</h2>
                  <p>{featuredPost.excerpt}</p>
                  <span className="bp-read">{page.readLabel}<ArrowRight size={15} /></span>
                </div>
              </a>
            </section>
          )}

          <section className="bp-list-section" ref={listRef}>
            <div className="bp-heading gp-reveal">
              <p className="eyebrow dark gp-eyebrow">{page.sections.latestEyebrow}</p>
              <h2><Split text={page.sections.latestTitle} /><em className="gp-shine"><Split text={page.sections.latestHighlight} start={2} /></em></h2>
            </div>

            <div className="bp-chips gp-reveal" role="group" aria-label="Filter stories">
              {categories.map((item) => (
                <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'All' ? 'All Stories' : item}</button>
              ))}
            </div>

            {visiblePosts.length > 0 ? (
              <div className="bp-list">
                {visiblePosts.map((post, index) => (
                  <a key={post.slug} className="bp-card tilt-3d gp-reveal" {...tiltHandlers} href={postHref(post)} style={{ ['--i' as string]: index } as React.CSSProperties}>
                    <div className="bp-thumb">
                      <Cover post={post} sizes="(max-width: 800px) 40vw, 22vw" />
                      {post.video && <i className="bp-play"><Play size={16} fill="currentColor" /></i>}
                    </div>
                    <div className="bp-card-copy">
                      <span className="bp-badge">{post.category}</span>
                      <h3>{post.title}</h3>
                      {meta(post)}
                      <p>{post.excerpt}</p>
                      <span className="bp-read">{page.readLabel}<ArrowRight size={14} /></span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="gp-none">No stories in this category yet.</p>
            )}

            {totalPages > 1 && (
              <nav className="gp-pagination" aria-label="Blog pages">
                <button aria-label="Previous page" disabled={pageIndex === 1} onClick={() => goToPage(pageIndex - 1)}><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button key={index} className={pageIndex === index + 1 ? 'active' : ''} onClick={() => goToPage(index + 1)}>{index + 1}</button>
                ))}
                <button aria-label="Next page" disabled={pageIndex === totalPages} onClick={() => goToPage(pageIndex + 1)}><ChevronRight size={16} /></button>
              </nav>
            )}
          </section>
        </>
      )}

      <section className="gp-closing gp-reveal">
        {page.closing.image && <Image src={page.closing.image} alt="" fill sizes="100vw" unoptimized={page.closing.image.endsWith('.svg')} />}
        <div className="gp-closing-shade" />
        <div className="gp-closing-card">
          <h2><Split text={page.closing.title} /></h2>
          <p className="gp-fade">{page.closing.description}</p>
          <a className="primary-button" href={safeHref(page.closing.buttonHref)}>{page.closing.buttonLabel}<ArrowRight size={15} /></a>
        </div>
      </section>

      {isVisible('footer') && (
        <footer className="site-footer conference-footer gp-footer gp-reveal" id="contact">
          <div className="footer-main">
            <div className="footer-about">
              <a hidden={!isVisible('brand')} href="/" className="wordmark"><Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} /><span>{content.brand.name}<small>{content.brand.tagline}</small></span></a>
              <p>{content.footer.description}</p>
              <div className="footer-socials">{content.footer.socialLinks.map((social, index) => <a key={`${social.label}-${index}`} href={safeHref(social.href)} aria-label={social.label}>{social.label.slice(0, 1)}</a>)}</div>
            </div>
            <div className="footer-links"><h3><Split text={content.footer.quickLinksTitle} /></h3><div>{content.navigation.items.map((item, index) => <a key={`${item.label}-${index}`} style={{ ['--w' as string]: index }} href={navigationHref(item.label, item.href)}>{item.label}</a>)}</div></div>
            <div className="footer-contact"><h3><Split text={content.footer.contactTitle} /></h3><p><MapPin size={16} />{content.footer.venue}<br />{content.footer.location}</p><a href={`mailto:${content.footer.email}`}>✉ {content.footer.email}</a><a href={`tel:${content.footer.phone.replace(/[^\d+]/g, '')}`}>☎ {content.footer.phone}</a></div>
            <div className="footer-subscribe"><h3><Split text={content.footer.subscribeTitle} /></h3><p>{content.footer.subscribeText}</p><EmailEngagementForm type="newsletter" placeholder={content.footer.subscribePlaceholder} emailLabel={content.footer.subscribePlaceholder} buttonLabel={content.footer.subscribeButtonLabel} compact /></div>
          </div>
          <div className="footer-bottom"><span>{content.footer.copyright}</span><span><a href={safeHref(content.footer.privacyHref)}>{content.footer.privacy}</a>　|　<a href={safeHref(content.footer.termsHref)}>{content.footer.terms}</a>　|　<a href={safeHref(content.footer.refundHref)}>{content.footer.refund}</a>　|　<a href={safeHref(content.footer.sitemapHref)}>{content.footer.sitemap}</a></span></div>
        </footer>
      )}
    </main>
  )
}
