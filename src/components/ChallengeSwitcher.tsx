import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDeckIndex } from '../data/deckRegistry'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'

interface ChallengeSwitcherProps {
  currentCode: string
  /** Where sibling links go: deck intro, challenge experience, or assistant. */
  mode?: 'deck' | 'challenge' | 'assistant'
  className?: string
}

function pathFor(mode: 'deck' | 'challenge' | 'assistant', code: string): string {
  if (mode === 'assistant') return `/assistant/${code}`
  if (mode === 'deck') return `/decks/${code}`
  return `/challenge/${code}`
}

/** Jump to another challenge deck without returning to the home index. */
export function ChallengeSwitcher({
  currentCode,
  mode = 'challenge',
  className,
}: ChallengeSwitcherProps) {
  const { t, i18n } = useTranslation()
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const others = getDeckIndex().filter((d) => d.code !== currentCode)
  if (others.length === 0) return null

  return (
    <nav
      className={['challenge-switcher', className].filter(Boolean).join(' ')}
      aria-label={t('challenge.otherChallenges')}
    >
      <div className="challenge-switcher-links">
        {others.map((deck) => {
          const name = metaTable[deck.code]?.name ?? deck.name
          return (
            <Link
              key={deck.code}
              to={pathFor(mode, deck.code)}
              className="challenge-switcher-chip"
            >
              {name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
