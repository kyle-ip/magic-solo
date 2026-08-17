import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ArenaToolButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: ReactNode
}

/** Topbar action: text on desktop, icon on narrow screens. */
export function ArenaToolButton({
  label,
  icon,
  className = '',
  ...rest
}: ArenaToolButtonProps) {
  return (
    <button
      type="button"
      className={`btn ghost arena-tool-btn ${className}`.trim()}
      title={label}
      aria-label={label}
      {...rest}
    >
      <span className="arena-tool-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="arena-tool-label">{label}</span>
    </button>
  )
}

export const arenaToolIcons = {
  shuffle: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M4 7h3.2l2.4 3.2L12 7h3M16 7h4m0 0-2.2-2.2M20 7l-2.2 2.2M4 17h3.2l2.4-3.2L12 17h3M16 17h4m0 0-2.2-2.2M20 17l-2.2 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm10 2.5-4.3-4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.1-5.2M4.5 4.8v4.4h4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M14.5 5.5 8 12l6.5 6.5M8 12h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}
