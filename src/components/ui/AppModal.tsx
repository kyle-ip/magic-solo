import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { clsx } from 'clsx'
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

/** Nested overlays: only the topmost Escape handler runs. */
const escapeStack: Array<() => void> = []

export type AppModalProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  titleId?: string
  headerActions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  shellClassName?: string
  size?: 'default' | 'wide' | 'narrow'
  /** Close when backdrop is clicked (default true). */
  closeOnBackdrop?: boolean
}

export function AppModal({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  headerActions,
  children,
  footer,
  className,
  shellClassName,
  size = 'default',
  closeOnBackdrop = true,
}: AppModalProps) {
  const reduce = useReducedMotion()
  const autoId = useId()
  const titleId = titleIdProp ?? autoId
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    escapeStack.push(onClose)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escapeStack[escapeStack.length - 1] !== onClose) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => {
      shellRef.current?.focus()
    }, 0)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      const i = escapeStack.lastIndexOf(onClose)
      if (i >= 0) escapeStack.splice(i, 1)
      window.clearTimeout(t)
    }
  }, [open, onClose])

  const onBackdropClick = (e: ReactMouseEvent) => {
    if (!closeOnBackdrop) return
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={clsx('app-overlay-backdrop', 'modal-backdrop', className)}
          role="presentation"
          onClick={onBackdropClick}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <motion.div
            ref={shellRef}
            className={clsx(
              'app-overlay-shell',
              size === 'wide' && 'is-wide',
              size === 'narrow' && 'is-narrow',
              shellClassName,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {title || headerActions ? (
              <div className="app-overlay-head">
                {title ? (
                  <h2 id={titleId} className="app-overlay-title">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {headerActions}
              </div>
            ) : null}
            <div className="app-overlay-body">{children}</div>
            {footer ? <div className="app-overlay-foot">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
