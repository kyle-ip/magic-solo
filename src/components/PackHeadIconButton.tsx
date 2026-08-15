import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type PackHeadIcon =
  | 'redraw'
  | 'collect'
  | 'collected'
  | 'cabinet'
  | 'back'
  | 'close'

const ICONS: Record<PackHeadIcon, ReactNode> = {
  redraw: (
    <path
      d="M7.2 8.2A6.5 6.5 0 0 1 18.6 10M16.8 15.8A6.5 6.5 0 0 1 5.4 14M18.8 6.2v4.2h-4.2M5.2 17.8v-4.2h4.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  collect: (
    <path
      d="M12 17.2 6.8 20l1-5.5L3.6 10.7l5.6-.8L12 5l2.8 4.9 5.6.8-4.2 3.8 1 5.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinejoin="round"
    />
  ),
  collected: (
    <path
      d="M12 17.2 6.8 20l1-5.5L3.6 10.7l5.6-.8L12 5l2.8 4.9 5.6.8-4.2 3.8 1 5.5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  ),
  cabinet: (
    <path
      d="M5.2 7.2h13.6v11.2H5.2V7.2Zm0 3.4h13.6M12 10.6v7.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  back: (
    <path
      d="M14.2 6.5 8.8 12l5.4 5.5M9.2 12h7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  close: (
    <path
      d="M7.2 7.2 16.8 16.8M16.8 7.2 7.2 16.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  ),
}

interface PackHeadIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: PackHeadIcon
  label: string
}

/** Compact icon control for pack / draw / inspect modal headers. */
export function PackHeadIconButton({
  icon,
  label,
  className = '',
  ...rest
}: PackHeadIconButtonProps) {
  return (
    <button
      type="button"
      className={`pack-head-icon-btn ${className}`.trim()}
      title={label}
      aria-label={label}
      {...rest}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </button>
  )
}
