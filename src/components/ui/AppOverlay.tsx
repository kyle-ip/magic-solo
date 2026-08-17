import { useEffect, useState } from 'react'
import { AppModal, type AppModalProps } from './AppModal'
import { AppSheet, type AppSheetProps } from './AppSheet'

const SHEET_MQ = '(max-width: 640px)'

function usePreferSheet() {
  const [prefer, setPrefer] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(SHEET_MQ).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(SHEET_MQ)
    const onChange = () => setPrefer(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return prefer
}

type AppOverlayProps = Omit<AppModalProps, 'size'> &
  Pick<AppSheetProps, 'nested'> & {
    /** Force modal or sheet; default follows narrow viewport. */
    mode?: 'auto' | 'modal' | 'sheet'
    size?: AppModalProps['size']
  }

/** Desktop centered modal; narrow viewports use a bottom sheet. */
export function AppOverlay({
  mode = 'auto',
  nested,
  size,
  shellClassName,
  className,
  ...rest
}: AppOverlayProps) {
  const preferSheet = usePreferSheet()
  const useSheet =
    mode === 'sheet' || (mode === 'auto' && preferSheet)

  if (useSheet) {
    return (
      <AppSheet
        nested={nested}
        className={shellClassName ?? className}
        {...rest}
      />
    )
  }
  return (
    <AppModal
      size={size}
      shellClassName={shellClassName}
      className={className}
      {...rest}
    />
  )
}
