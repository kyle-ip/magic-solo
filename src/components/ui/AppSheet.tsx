import { Drawer } from 'vaul'
import { clsx } from 'clsx'
import { useId, type ReactNode } from 'react'

export type AppSheetProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  titleId?: string
  headerActions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  /** Nested drawer (default false). */
  nested?: boolean
}

export function AppSheet({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  headerActions,
  children,
  footer,
  className,
  nested = false,
}: AppSheetProps) {
  const autoId = useId()
  const titleId = titleIdProp ?? autoId
  const Root = nested ? Drawer.NestedRoot : Drawer.Root

  return (
    <Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="app-sheet-overlay" />
        <Drawer.Content
          className={clsx('app-sheet-content', className)}
          aria-labelledby={title ? titleId : undefined}
        >
          <div className="app-sheet-handle" aria-hidden="true" />
          {title || headerActions ? (
            <div className="app-overlay-head">
              {title ? (
                <Drawer.Title id={titleId} className="app-overlay-title">
                  {title}
                </Drawer.Title>
              ) : (
                <Drawer.Title className="sr-only">Dialog</Drawer.Title>
              )}
              {headerActions}
            </div>
          ) : (
            <Drawer.Title className="sr-only">Dialog</Drawer.Title>
          )}
          <div className="app-overlay-body">{children}</div>
          {footer ? <div className="app-overlay-foot">{footer}</div> : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Root>
  )
}
