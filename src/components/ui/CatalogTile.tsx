import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type CatalogTileProps = {
  to: LinkProps['to']
  title: ReactNode
  meta?: ReactNode
  media?: ReactNode
  className?: string
  children?: ReactNode
}

export function CatalogTile({
  to,
  title,
  meta,
  media,
  className,
  children,
}: CatalogTileProps) {
  return (
    <Link to={to} className={clsx('catalog-tile', className)}>
      {media ? <div className="catalog-tile-media">{media}</div> : null}
      <div className="catalog-tile-body">
        <h3 className="catalog-tile-title">{title}</h3>
        {meta ? <p className="catalog-tile-meta">{meta}</p> : null}
        {children}
      </div>
    </Link>
  )
}
