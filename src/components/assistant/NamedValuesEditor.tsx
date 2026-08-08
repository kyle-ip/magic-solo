import { useTranslation } from 'react-i18next'
import type { NamedValue } from '../../assistant/types'

type Props = {
  title: string
  values: NamedValue[]
  onAdd: () => void
  onUpdate: (id: string, patch: { label?: string; value?: number }) => void
  onRemove: (id: string) => void
  compact?: boolean
}

export function NamedValuesEditor({
  title,
  values,
  onAdd,
  onUpdate,
  onRemove,
  compact,
}: Props) {
  const { t } = useTranslation()

  return (
    <div
      className={`named-values ${compact ? 'is-compact' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="named-values-head">
        <span>{title}</span>
        <button type="button" className="btn ghost tiny" onClick={onAdd}>
          + {t('assistant.addValue')}
        </button>
      </div>
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
    </div>
  )
}
