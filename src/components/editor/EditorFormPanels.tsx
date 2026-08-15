import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlayerEffect } from '../../game/playerDecks'
import type { EditorCardDocument, EditorFrameId, EditorRarity } from '../../editor/types'

const FRAME_OPTIONS: EditorFrameId[] = [
  'auto',
  'white',
  'blue',
  'black',
  'red',
  'green',
  'gold',
  'artifact',
  'colorless',
  'land',
]

const RARITY_OPTIONS: EditorRarity[] = [
  'common',
  'uncommon',
  'rare',
  'mythic',
]

const KIND_OPTIONS = ['land', 'creature', 'instant', 'sorcery'] as const

const EFFECT_PRESETS: { id: string; labelKey: string; effect: PlayerEffect }[] =
  [
    { id: 'none', labelKey: 'cardEditor.effectNone', effect: { type: 'none' } },
    {
      id: 'draw1',
      labelKey: 'cardEditor.effectDraw1',
      effect: { type: 'draw', amount: 1 },
    },
    {
      id: 'draw2',
      labelKey: 'cardEditor.effectDraw2',
      effect: { type: 'draw', amount: 2 },
    },
    {
      id: 'damage3',
      labelKey: 'cardEditor.effectDamage3',
      effect: { type: 'damage_any', amount: 3 },
    },
    { id: 'fog', labelKey: 'cardEditor.effectFog', effect: { type: 'fog' } },
    {
      id: 'fight',
      labelKey: 'cardEditor.effectFight',
      effect: { type: 'fight' },
    },
    {
      id: 'destroy',
      labelKey: 'cardEditor.effectDestroy',
      effect: { type: 'destroy_creature' },
    },
  ]

type EditorFormPanelsProps = {
  doc: EditorCardDocument
  onChange: (patch: Partial<EditorCardDocument>) => void
  onArtFile: (file: File) => void
}

export function EditorFormPanels({
  doc,
  onChange,
  onArtFile,
}: EditorFormPanelsProps) {
  const { t } = useTranslation()
  const artRef = useRef<HTMLInputElement>(null)
  const effectKey =
    EFFECT_PRESETS.find((p) => {
      if (p.effect.type !== doc.effect.type) return false
      if (p.effect.type === 'draw' && doc.effect.type === 'draw') {
        return p.effect.amount === doc.effect.amount
      }
      if (p.effect.type === 'damage_any' && doc.effect.type === 'damage_any') {
        return p.effect.amount === doc.effect.amount
      }
      return true
    })?.id ?? 'none'

  return (
    <div className="card-editor-forms">
      <section className="card-editor-panel">
        <h3>{t('cardEditor.sectionIdentity')}</h3>
        <label className="card-editor-field">
          <span>{t('cardEditor.cardLanguage')}</span>
          <select
            value={doc.language}
            onChange={(e) =>
              onChange({ language: e.target.value as 'en' | 'zh' })
            }
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.nameEn')}</span>
          <input
            value={doc.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.nameZh')}</span>
          <input
            value={doc.nameZh}
            onChange={(e) => onChange({ nameZh: e.target.value })}
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.manaCost')}</span>
          <input
            value={doc.manaCost}
            onChange={(e) => onChange({ manaCost: e.target.value })}
            placeholder="{1}{G}"
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.typeLineEn')}</span>
          <input
            value={doc.typeLine}
            onChange={(e) => onChange({ typeLine: e.target.value })}
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.typeLineZh')}</span>
          <input
            value={doc.typeLineZh}
            onChange={(e) => onChange({ typeLineZh: e.target.value })}
          />
        </label>
      </section>

      <section className="card-editor-panel">
        <h3>{t('cardEditor.sectionFrame')}</h3>
        <label className="card-editor-field">
          <span>{t('cardEditor.frame')}</span>
          <select
            value={doc.frame}
            onChange={(e) =>
              onChange({ frame: e.target.value as EditorFrameId })
            }
          >
            {FRAME_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {t(`cardEditor.frame_${f}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.rarity')}</span>
          <select
            value={doc.rarity}
            onChange={(e) =>
              onChange({ rarity: e.target.value as EditorRarity })
            }
          >
            {RARITY_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {t(`cardEditor.rarity_${r}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="card-editor-field-row">
          <label className="card-editor-field">
            <span>{t('cardEditor.setCode')}</span>
            <input
              value={doc.setCode}
              onChange={(e) => onChange({ setCode: e.target.value })}
            />
          </label>
          <label className="card-editor-field">
            <span>{t('cardEditor.collector')}</span>
            <input
              value={doc.collectorNumber}
              onChange={(e) => onChange({ collectorNumber: e.target.value })}
            />
          </label>
        </div>
        <label className="card-editor-field">
          <span>{t('cardEditor.artist')}</span>
          <input
            value={doc.artist}
            onChange={(e) => onChange({ artist: e.target.value })}
          />
        </label>
      </section>

      <section className="card-editor-panel">
        <h3>{t('cardEditor.sectionArt')}</h3>
        <label className="card-editor-field">
          <span>{t('cardEditor.artUrl')}</span>
          <input
            value={doc.artUrl.startsWith('blob:') ? '' : doc.artUrl}
            placeholder={
              doc.artUrl.startsWith('blob:')
                ? t('cardEditor.artLocal')
                : 'https://…'
            }
            onChange={(e) =>
              onChange({
                artUrl: e.target.value,
                artCrop: { x: 0.5, y: 0.5, zoom: 1 },
              })
            }
          />
        </label>
        <div className="card-editor-toolbar-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => artRef.current?.click()}
          >
            {t('cardEditor.artUpload')}
          </button>
          <input
            ref={artRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onArtFile(f)
              e.target.value = ''
            }}
          />
        </div>
        <label className="card-editor-field">
          <span>
            {t('cardEditor.artZoom')}: {doc.artCrop.zoom.toFixed(2)}
          </span>
          <input
            type="range"
            min={0.6}
            max={3}
            step={0.01}
            value={doc.artCrop.zoom}
            onChange={(e) =>
              onChange({
                artCrop: { ...doc.artCrop, zoom: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.artPanX')}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={doc.artCrop.x}
            onChange={(e) =>
              onChange({
                artCrop: { ...doc.artCrop, x: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.artPanY')}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={doc.artCrop.y}
            onChange={(e) =>
              onChange({
                artCrop: { ...doc.artCrop, y: Number(e.target.value) },
              })
            }
          />
        </label>
      </section>

      <section className="card-editor-panel">
        <h3>{t('cardEditor.sectionText')}</h3>
        <label className="card-editor-field">
          <span>{t('cardEditor.oracleEn')}</span>
          <textarea
            rows={5}
            value={doc.oracleText}
            onChange={(e) => onChange({ oracleText: e.target.value })}
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.oracleZh')}</span>
          <textarea
            rows={5}
            value={doc.oracleTextZh}
            onChange={(e) => onChange({ oracleTextZh: e.target.value })}
          />
        </label>
        <div className="card-editor-field-row">
          <label className="card-editor-field">
            <span>{t('cardEditor.power')}</span>
            <input
              value={doc.power ?? ''}
              onChange={(e) =>
                onChange({
                  power: e.target.value === '' ? null : e.target.value,
                })
              }
            />
          </label>
          <label className="card-editor-field">
            <span>{t('cardEditor.toughness')}</span>
            <input
              value={doc.toughness ?? ''}
              onChange={(e) =>
                onChange({
                  toughness: e.target.value === '' ? null : e.target.value,
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="card-editor-panel">
        <h3>{t('cardEditor.sectionDeck')}</h3>
        <label className="card-editor-field">
          <span>{t('cardEditor.kind')}</span>
          <select
            value={doc.kind}
            onChange={(e) =>
              onChange({
                kind: e.target.value as EditorCardDocument['kind'],
              })
            }
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {t(`cardEditor.kind_${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.quantity')}</span>
          <input
            type="number"
            min={1}
            max={99}
            value={doc.quantity}
            onChange={(e) =>
              onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.keywords')}</span>
          <input
            value={doc.keywords.join(', ')}
            onChange={(e) =>
              onChange({
                keywords: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Flying, Haste"
          />
        </label>
        <label className="card-editor-field">
          <span>{t('cardEditor.effect')}</span>
          <select
            value={effectKey}
            onChange={(e) => {
              const preset = EFFECT_PRESETS.find((p) => p.id === e.target.value)
              if (preset) onChange({ effect: preset.effect })
            }}
          >
            {EFFECT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <p className="card-editor-hint">{t('cardEditor.deckExportHint')}</p>
      </section>
    </div>
  )
}
