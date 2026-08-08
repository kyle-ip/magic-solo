import type { ReactNode } from 'react'

type Props = {
  zone: string
  placement?: string
  index?: number
  className?: string
  children?: ReactNode
  active?: boolean
}

/** Marks a DOM region as a drop target via data attributes for pointer DnD. */
export function DropZone({
  zone,
  placement,
  index,
  className,
  children,
  active,
}: Props) {
  return (
    <div
      className={[className, active ? 'is-drop-active' : ''].filter(Boolean).join(' ')}
      data-drop-zone={zone}
      data-drop-placement={placement}
      data-drop-index={index != null ? String(index) : undefined}
    >
      {children}
    </div>
  )
}
