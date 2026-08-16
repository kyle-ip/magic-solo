import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { NamedValue } from '../../assistant/types'
import { PackHeadIconButton } from '../PackHeadIconButton'

type Props = {
  title: string
  values: NamedValue[]
  onAdd: () => void
  onUpdate: (id: string, patch: { label?: string; value?: number }) => void
  onRemove: (id: string) => void
  compact?: boolean
  /** Enable drag / collapse / close chrome (assistant floating panel). */
  floating?: boolean
  storageKey?: string
}

type PanelPos = { x: number; y: number }

type StoredPanel = {
  collapsed?: boolean
  closed?: boolean
  pos?: PanelPos
}

const DRAG_THRESHOLD = 4

function loadStored(key?: string): StoredPanel {
  if (!key || typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as StoredPanel
  } catch {
    return {}
  }
}

function saveStored(key: string | undefined, data: StoredPanel) {
  if (!key || typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

function clampPos(x: number, y: number, w: number, h: number): PanelPos {
  const pad = 8
  const maxX = Math.max(pad, window.innerWidth - w - pad)
  const maxY = Math.max(pad, window.innerHeight - h - pad)
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  }
}

export function NamedValuesEditor({
  title,
  values,
  onAdd,
  onUpdate,
  onRemove,
  compact,
  floating,
  storageKey,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const stored = useRef(loadStored(storageKey))

  const [collapsed, setCollapsed] = useState(Boolean(stored.current.collapsed))
  const [closed, setClosed] = useState(Boolean(stored.current.closed))
  const [pos, setPos] = useState<PanelPos | null>(stored.current.pos ?? null)
  const [dragging, setDragging] = useState(false)

  const persist = useCallback(
    (next: { collapsed: boolean; closed: boolean; pos: PanelPos | null }) => {
      saveStored(storageKey, {
        collapsed: next.collapsed,
        closed: next.closed,
        pos: next.pos ?? undefined,
      })
    },
    [storageKey],
  )

  useEffect(() => {
    if (!floating) return
    const onResize = () => {
      setPos((prev) => {
        if (!prev || !panelRef.current) return prev
        return clampPos(
          prev.x,
          prev.y,
          panelRef.current.offsetWidth,
          panelRef.current.offsetHeight,
        )
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [floating])

  const onDragHandle = (e: ReactPointerEvent<HTMLElement>) => {
    if (!floating || e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, input, a')) return

    e.preventDefault()
    e.stopPropagation()

    const el = panelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const origin = pos ?? { x: rect.left, y: rect.top }
    if (!pos) setPos(origin)

    const startX = e.clientX
    const startY = e.clientY
    let last = origin
    let moved = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!moved && dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
      moved = true
      setDragging(true)
      last = clampPos(
        origin.x + dx,
        origin.y + dy,
        el.offsetWidth,
        el.offsetHeight,
      )
      setPos(last)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDragging(false)
      if (moved) {
        setPos(last)
        persist({ collapsed, closed, pos: last })
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (floating && closed) {
    return (
      <button
        type="button"
        className="named-values-restore"
        onClick={() => {
          setClosed(false)
          persist({ collapsed, closed: false, pos })
        }}
      >
        {t('assistant.showPlayerValues')}
      </button>
    )
  }

  return (
    <div
      ref={panelRef}
      className={[
        'named-values',
        compact ? 'is-compact' : '',
        floating ? 'is-floating' : '',
        collapsed ? 'is-collapsed' : '',
        dragging ? 'is-dragging' : '',
        pos ? 'is-positioned' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        floating && pos
          ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
          : undefined
      }
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="named-values-head"
        onPointerDown={floating ? onDragHandle : undefined}
      >
        <span className={floating ? 'named-values-drag' : undefined}>{title}</span>
        <div className="named-values-actions">
          {!collapsed ? (
            <button type="button" className="btn ghost tiny" onClick={onAdd}>
              + {t('assistant.addValue')}
            </button>
          ) : null}
          {floating ? (
            <>
              <button
                type="button"
                className="btn ghost tiny"
                onClick={() => {
                  const next = !collapsed
                  setCollapsed(next)
                  persist({ collapsed: next, closed, pos })
                }}
                aria-expanded={!collapsed}
                title={
                  collapsed
                    ? t('assistant.expandPanel')
                    : t('assistant.collapsePanel')
                }
              >
                {collapsed ? '▢' : '–'}
              </button>
              <PackHeadIconButton
                className="named-values-close"
                icon="close"
                label={t('assistant.closePanel')}
                onClick={() => {
                  setClosed(true)
                  persist({ collapsed, closed: true, pos })
                }}
              />
            </>
          ) : null}
        </div>
      </div>
      {collapsed ? null : (
        <ul className="named-values-list">
          {values.map((v) => (
            <li key={v.id}>
              <input
                className="named-value-label"
                value={v.label}
                aria-label={t('assistant.valueLabel')}
                onChange={(e) => onUpdate(v.id, { label: e.target.value })}
              />
              <div className="named-value-controls">
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => onUpdate(v.id, { value: v.value - 1 })}
                >
                  −
                </button>
                <input
                  className="named-value-num"
                  type="number"
                  value={v.value}
                  onChange={(e) =>
                    onUpdate(v.id, { value: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => onUpdate(v.id, { value: v.value + 1 })}
                >
                  +
                </button>
                <button
                  type="button"
                  className="btn ghost tiny is-danger"
                  onClick={() => onRemove(v.id)}
                  aria-label={t('assistant.reset')}
                  title="×"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
