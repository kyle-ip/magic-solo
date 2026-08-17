import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

const PackDrawButton = lazy(() =>
  import('./PackDrawButton').then((m) => ({ default: m.PackDrawButton })),
)
const SingleDrawButton = lazy(() =>
  import('./SingleDrawButton').then((m) => ({ default: m.SingleDrawButton })),
)

function scheduleIdle(start: () => void, timeoutMs: number): () => void {
  const ric = (
    window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    const id = ric(start, { timeout: timeoutMs })
    return () => window.cancelIdleCallback?.(id)
  }
  const tid = window.setTimeout(start, Math.max(0, timeoutMs - 1000))
  return () => window.clearTimeout(tid)
}

export function DrawNavMenu() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const [packOpen, setPackOpen] = useState(false)
  const [singleOpen, setSingleOpen] = useState(false)
  const [packMounted, setPackMounted] = useState(false)
  const [singleMounted, setSingleMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    return scheduleIdle(() => {
      void import('./PackDrawButton').catch(() => undefined)
    }, 1200)
  }, [])

  useEffect(() => {
    return scheduleIdle(() => {
      void import('./SingleDrawButton').catch(() => undefined)
    }, 1400)
  }, [])

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setPanelPos(null)
      return
    }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPanelPos({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const openPack = () => {
    setMenuOpen(false)
    void import('./PackDrawButton')
      .then(() => {
        setPackMounted(true)
        setPackOpen(true)
      })
      .catch(() => {
        setPackMounted(true)
        setPackOpen(true)
      })
  }

  const openSingle = () => {
    setMenuOpen(false)
    void import('./SingleDrawButton')
      .then(() => {
        setSingleMounted(true)
        setSingleOpen(true)
      })
      .catch(() => {
        setSingleMounted(true)
        setSingleOpen(true)
      })
  }

  const panel =
    menuOpen && panelPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="site-nav-menu-panel"
            id={menuId}
            role="menu"
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <button
              type="button"
              className="site-nav-menu-item"
              role="menuitem"
              onClick={openPack}
            >
              {t('packDraw.open')}
            </button>
            <button
              type="button"
              className="site-nav-menu-item"
              role="menuitem"
              onClick={openSingle}
            >
              {t('singleDraw.open')}
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className={`site-nav-menu${menuOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="references-text-btn site-nav-menu-trigger"
          ref={triggerRef}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {t('nav.draw')}
        </button>
        {panel}
      </div>
      {packMounted ? (
        <Suspense fallback={null}>
          <PackDrawButton open={packOpen} onOpenChange={setPackOpen} />
        </Suspense>
      ) : null}
      {singleMounted ? (
        <Suspense fallback={null}>
          <SingleDrawButton open={singleOpen} onOpenChange={setSingleOpen} />
        </Suspense>
      ) : null}
    </>
  )
}
