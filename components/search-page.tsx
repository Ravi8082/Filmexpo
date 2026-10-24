'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { useScrollReveal } from '@/lib/use-scroll-reveal'
import { useTilt } from '@/lib/use-tilt'
import { runSearch, type SearchItem } from '@/lib/search-index'

const KIND_ORDER = ['Blog', 'Speaker', 'Gallery', 'News']

export function SearchPage({ index, total }: { index: SearchItem[]; total: number }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => runSearch(index, query), [index, query])
  useScrollReveal('.fx-reveal', [total])
  useTilt('[data-tilt]', [results.length])
  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    for (const item of results) map.set(item.kind, [...(map.get(item.kind) ?? []), item])
    return KIND_ORDER.filter((kind) => map.has(kind)).flatMap((kind) => map.get(kind)!.map((item) => ({ kind, item })))
  }, [results])

  return (
    <main className="search-page">
      <article className="search-shell">
        <a className="search-back fx-reveal" href="/"><ArrowLeft size={14} /> Back to home</a>
        <header className="search-head fx-reveal">
          <p className="legal-eyebrow">SEARCH</p>
          <h1>Search Film Expo <em className="fx-shine">India</em></h1>
          <p className="search-intro">Find stories, speakers, galleries and news across the site.</p>
        </header>

        <div className="search-bar fx-reveal">
          <Search size={18} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories, speakers, sessions…"
            aria-label="Search the site"
          />
        </div>

        <p className="search-count" aria-live="polite">
          {query.trim().length < 2
            ? `${total} items across blog, speakers, gallery and news`
            : results.length === 0 ? 'No results found' : `${results.length} result${results.length === 1 ? '' : 's'}`}
        </p>

        <div className="search-results">
          {grouped.map(({ kind, item }, keyIndex) => (
            <a key={`${item.url}-${keyIndex}`} className="search-result fx-reveal fx-tilt" data-tilt style={{ ['--fx-i' as string]: keyIndex + 1 }} href={item.url}>
              <span className="search-result-kind">{kind}</span>
              <span className="search-result-body">
                <strong>{item.title}</strong>
                {item.snippet && <p>{item.snippet}</p>}
              </span>
            </a>
          ))}
        </div>
      </article>
    </main>
  )
}
