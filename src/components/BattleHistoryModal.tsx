import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleHistoryRecord } from '../data/battleHistory'
import { LlmRichText } from './LlmRichText'
import { PackHeadIconButton } from './PackHeadIconButton'
import '../styles/llm.css'

interface BattleHistoryModalProps {
  record: BattleHistoryRecord
  challengeName: string
  onClose: () => void
  onDelete: (id: string) => void
}

export function BattleHistoryModal({
  record,
  challengeName,
  onClose,
  onDelete,
}: BattleHistoryModalProps) {
  const { t, i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const deckName = zh ? record.playerDeckNameZh : record.playerDeckName
  const won = record.status === 'won'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const when = new Date(record.updatedAt).toLocaleString(
    zh ? 'zh-CN' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' },
  )

  return (
    <div className="prompt-backdrop battle-history-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`battle-history-panel is-${record.status}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="battle-history-panel-head">
          <div>
            <p className="settlement-eyebrow">
              {won ? t('challenge.settlementWin') : t('challenge.settlementLoss')}
            </p>
            <h2 id="battle-history-title">
              {won ? t('challenge.victory') : t('challenge.defeat')}
            </h2>
            <p className="settlement-lead">
              {record.resultKey
                ? t(`challenge.result.${record.resultKey}`)
                : won
                  ? t('challenge.victory')
                  : t('challenge.defeat')}
            </p>
            <p className="settlement-matchup">
              {deckName} <span>vs</span> {challengeName}
            </p>
            <p className="battle-history-when">{when}</p>
          </div>
          <PackHeadIconButton
            icon="close"
            label={t('deck.close')}
            onClick={onClose}
          />
        </header>

        <dl className="settlement-stats">
          <div>
            <dt>{t('challenge.statTurns')}</dt>
            <dd>{record.turnNumber}</dd>
          </div>
          <div>
            <dt>{t('challenge.statLife')}</dt>
            <dd>{record.life}</dd>
          </div>
          <div>
            <dt>{t('challenge.statAlive')}</dt>
            <dd>{record.creaturesAlive}</dd>
          </div>
          <div>
            <dt>{t('challenge.statFallen')}</dt>
            <dd>{record.fallen}</dd>
          </div>
          <div>
            <dt>{t('challenge.statLibrary')}</dt>
            <dd>{record.enemyLibrary}</dd>
          </div>
          <div>
            <dt>{t('challenge.statEnemyBoard')}</dt>
            <dd>{record.enemyBoard}</dd>
          </div>
        </dl>

        {record.battleReport ? (
          <div className="llm-battle-report" role="status">
            <strong>{t('llm.battleReport')}</strong>
            <LlmRichText text={record.battleReport} className="llm-md-flush" />
          </div>
        ) : (
          <p className="battle-history-empty-report">{t('deck.historyNoReport')}</p>
        )}

        {record.postAsks.length > 0 ? (
          <div className="battle-history-asks">
            {record.postAsks.map((qa, i) => (
              <div key={`${qa.question}-${i}`} className="llm-battle-report">
                <strong>{t('deck.historyAsk', { q: qa.question })}</strong>
                <LlmRichText text={qa.answer} className="llm-md-flush" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="settlement-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              onDelete(record.id)
              onClose()
            }}
          >
            {t('deck.historyDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}
