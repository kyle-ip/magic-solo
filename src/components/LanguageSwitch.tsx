import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ensureLocale } from '../i18n'

type LanguageSwitchProps = {
  /** Shorter option labels (EN / 中文) for tight toolbars. */
  compact?: boolean
  /**
   * Render as a ghost button that toggles locale (matches arena topbar `.btn` sizing).
   * Default is a themed custom select menu.
   */
  asButton?: boolean
}

export function LanguageSwitch({
  compact = false,
  asButton = false,
}: LanguageSwitchProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const setLang = (next: string) => {
    void ensureLocale(next).then(() => i18n.changeLanguage(next))
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPanelPos(null)
      return
    }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 6.5 * 16)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.max(8, left),
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

  if (asButton) {
    const label = isZh ? (compact ? '中文' : t('app.chinese')) : compact ? 'EN' : t('app.english')
    return (
      <button
        type="button"
        className="btn ghost lang-switch-btn"
        aria-label={t('app.language')}
        title={t('app.language')}
        onClick={() => setLang(isZh ? 'en' : 'zh')}
      >
        {label}
      </button>
    )
  }

  const currentLabel = isZh
    ? compact
      ? '中文'
      : t('app.chinese')
    : compact
      ? 'EN'
      : t('app.english')

  const panel =
    open && panelPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="site-nav-menu-panel lang-switch-panel"
            id={menuId}
            role="listbox"
            aria-label={t('app.language')}
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <button
              type="button"
              role="option"
              aria-selected={!isZh}
              className={`site-nav-menu-item${!isZh ? ' is-active' : ''}`}
              onClick={() => {
                setLang('en')
                setOpen(false)
              }}
            >
              {compact ? 'EN' : t('app.english')}
            </button>
            <button
              type="button"
              role="option"
              aria-selected={isZh}
              className={`site-nav-menu-item${isZh ? ' is-active' : ''}`}
              onClick={() => {
                setLang('zh')
                setOpen(false)
              }}
            >
              {compact ? '中文' : t('app.chinese')}
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <div className={`lang-switch${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="lang-switch-trigger"
        ref={triggerRef}
        aria-label={t('app.language')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {currentLabel}
      </button>
      {panel}
    </div>
  )
}
