import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export type SectionTone = 'cream' | 'paper' | 'navy' | 'ink'

export function HomeSection({
  id,
  tone = 'cream',
  className = '',
  hidden,
  bleed,
  inner = 'box',
  ariaLabel,
  children,
}: {
  id?: string
  tone?: SectionTone
  className?: string
  hidden?: boolean
  bleed?: ReactNode
  inner?: 'box' | 'full'
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      hidden={hidden}
      aria-label={ariaLabel}
      className={`home-section home-section--${tone}${inner === 'full' ? ' home-section--flush' : ''}${className ? ` ${className}` : ''} reveal-on-scroll`}
    >
      {bleed}
      <div className="section-inner">{children}</div>
    </section>
  )
}

export function SectionHead({
  index,
  eyebrow,
  title,
  description,
  action,
  align = 'left',
}: {
  index?: number
  eyebrow?: string
  title: string
  description?: string
  action?: { label: string; href: string }
  align?: 'left' | 'center'
}) {
  if (!title?.trim() && !eyebrow?.trim()) return null
  const centered = align === 'center'
  return (
    <header className={`section-head${centered ? ' section-head--center' : ''}`}>
      <div className="section-head-main">
        <p className="eyebrow">
          {index !== undefined && <span className="section-index">{String(index).padStart(2, '0')}</span>}
          {eyebrow}
        </p>
        <h2>{title}</h2>
        {description && <p className="section-lead">{description}</p>}
      </div>
      {action && (
        <a className="outline-button light section-action" href={action.href}>
          {action.label} <ArrowRight size={15} />
        </a>
      )}
    </header>
  )
}
