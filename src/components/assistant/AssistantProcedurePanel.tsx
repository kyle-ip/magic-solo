import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChallengeCode } from '../../game/types'

const STEPS: Record<ChallengeCode, string[]> = {
  tfth: ['stepHydra1', 'stepHydra2', 'stepHydra3', 'stepHydra4'],
  tbth: ['stepHorde1', 'stepHorde2', 'stepHorde3', 'stepHorde4'],
  tdag: ['stepGod1', 'stepGod2', 'stepGod3', 'stepGod4'],
}

/** Collapsible static challenge procedure — no AI required. */
export function AssistantProcedurePanel({ code }: { code: ChallengeCode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const keys = STEPS[code]

  return (
    <div className={`assistant-procedure${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="assistant-procedure-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('assistant.procedureTitle')}
      </button>
      {open ? (
        <ol className="assistant-procedure-list">
          {keys.map((key) => (
            <li key={key}>{t(`assistant.procedure.${key}`)}</li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
