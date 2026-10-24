import type { HomepageContent } from '@/lib/site-content'

export type LegalPageContent = HomepageContent['legalPages']['privacy']

export function LegalPageView({ eyebrow, page }: { eyebrow: string; page: LegalPageContent }) {
  return (
    <main className="legal-page">
      <article>
        {eyebrow && <p className="legal-eyebrow">{eyebrow}</p>}
        <h1>{page.title}</h1>
        {page.updated && <p className="legal-updated">{page.updated}</p>}
        {page.intro && <p>{page.intro}</p>}
        {page.sections.map((section, index) => (
          <section key={`${section.heading}-${index}`}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.body && <p>{section.body}</p>}
          </section>
        ))}
      </article>
    </main>
  )
}
