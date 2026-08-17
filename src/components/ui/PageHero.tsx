import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type PageHeroProps = {
  kicker?: ReactNode
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  media?: ReactNode
  className?: string
  innerClassName?: string
  children?: ReactNode
}

export function PageHero({
  kicker,
  title,
  lead,
  actions,
  media,
  className,
  innerClassName,
  children,
}: PageHeroProps) {
  return (
    <section className={clsx('page-hero', className)}>
      <div
        className={clsx(
          'page-hero-inner',
          media ? 'is-split' : undefined,
          innerClassName,
        )}
      >
        <div className="page-hero-copy">
          {kicker ? <p className="page-hero-kicker">{kicker}</p> : null}
          <h1 className="page-hero-title">{title}</h1>
          {lead ? <p className="page-hero-lead">{lead}</p> : null}
          {actions ? <div className="page-hero-actions">{actions}</div> : null}
          {children}
        </div>
        {media ? <div className="page-hero-media">{media}</div> : null}
      </div>
    </section>
  )
}

type PageSectionProps = {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function PageSection({
  title,
  description,
  actions,
  className,
  children,
}: PageSectionProps) {
  return (
    <section className={clsx('page-section', className)}>
      {title || description || actions ? (
        <div className="page-section-head">
          <div>
            {title ? <h2 className="page-section-title">{title}</h2> : null}
            {description ? (
              <p className="page-section-desc">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}
