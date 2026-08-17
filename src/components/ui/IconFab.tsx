import { clsx } from 'clsx'
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type IconFabCommon = {
  className?: string
  configured?: boolean
  children: ReactNode
  title?: string
  'aria-label': string
}

export type IconFabButtonProps = IconFabCommon &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'title'> & {
    to?: never
  }

export type IconFabLinkProps = IconFabCommon &
  Omit<LinkProps, 'children' | 'className' | 'title'> & {
    to: LinkProps['to']
  }

function fabClass(configured: boolean | undefined, className?: string) {
  return clsx('icon-fab', 'floating-nav-btn', configured && 'is-configured', className)
}

export const IconFab = forwardRef<HTMLButtonElement, IconFabButtonProps>(
  function IconFab(
    { className, configured, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={fabClass(configured, className)}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

export function IconFabLink({
  className,
  configured,
  children,
  ...rest
}: IconFabLinkProps) {
  return (
    <Link className={fabClass(configured, className)} {...rest}>
      {children}
    </Link>
  )
}
