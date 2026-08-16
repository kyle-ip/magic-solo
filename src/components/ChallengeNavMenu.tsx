import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDeckIndex } from '../data/deckRegistry'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'

export function ChallengeNavMenu() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const decks = getDeckIndex()
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
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
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const panel =
    open && panelPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="site-nav-menu-panel"
            id={menuId}
            role="menu"
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            {decks.map((deck) => {
              const name = metaTable[deck.code]?.name ?? deck.name
              return (
                <Link
                  key={deck.code}
                  to={`/decks/${deck.code}`}
                  className="site-nav-menu-item"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {name}
                </Link>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <div className={`site-nav-menu${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="references-text-btn site-nav-menu-trigger"
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {t('nav.challenges')}
      </button>
      {panel}
    </div>
  )
}
