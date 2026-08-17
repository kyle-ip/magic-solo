import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      default: '',
      primary: 'primary',
      ghost: 'ghost',
      muted: 'muted',
    },
    size: {
      default: '',
      compact: 'compact',
      icon: 'icon',
      pill: 'pill',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

type ButtonVariantProps = VariantProps<typeof buttonVariants>

type UiButtonOwnProps = ButtonVariantProps & {
  className?: string
  children?: ReactNode
}

export type UiButtonProps = UiButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: 'button'
    to?: never
  }

export type UiButtonLinkProps = UiButtonOwnProps &
  Omit<LinkProps, 'className' | 'children'> & {
    as?: 'link'
    to: LinkProps['to']
  }

function resolveClassName(
  variant: ButtonVariantProps['variant'],
  size: ButtonVariantProps['size'],
  className?: string,
) {
  return clsx(buttonVariants({ variant, size }), className)
}

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(
  function UiButton(
    { variant, size, className, type = 'button', children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={resolveClassName(variant, size, className)}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

export function UiButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: UiButtonLinkProps) {
  return (
    <Link className={resolveClassName(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}

export type PolymorphicUiButtonProps = {
  as?: ElementType
} & UiButtonOwnProps &
  Record<string, unknown>
