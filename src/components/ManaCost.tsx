import { useEffect, useSyncExternalStore } from 'react'
import {
  getCachedManaSymbolUrl,
  loadManaSymbol,
  subscribeManaSymbols,
  splitManaTokens,
} from '../utils/manaSymbols'

function useManaSymbolSrc(code: string): string | null {
  const src = useSyncExternalStore(
    subscribeManaSymbols,
    () => getCachedManaSymbolUrl(code),
    () => null,
  )

  useEffect(() => {
    if (src) return
    void loadManaSymbol(code)
  }, [code, src])

  return src
}

export function ManaSymbol({
  code,
  className = 'mana-symbol',
}: {
  code: string
  className?: string
}) {
  const label = `{${code}}`
  const src = useManaSymbolSrc(code)

  if (!src) {
    return (
      <span
        className={`${className} is-loading`}
        aria-label={label}
        title={label}
      />
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={label}
      title={label}
      decoding="async"
      draggable={false}
    />
  )
}

/** Renders a mana cost like `{2}{G}{G}` as inline symbols. */
export function ManaCost({
  cost,
  className = 'pack-mana-cost',
}: {
  cost: string
  className?: string
}) {
  const tokens = splitManaTokens(cost)
  if (tokens.length === 0) return null
  return (
    <p className={className} aria-label={cost}>
      {tokens.map((tok, i) =>
        tok.type === 'mana' ? (
          <ManaSymbol key={`${tok.value}-${i}`} code={tok.value} />
        ) : (
          <span key={`t-${i}`}>{tok.value}</span>
        ),
      )}
    </p>
  )
}

/** Oracle / rules text with inline mana symbols; preserves newlines via CSS. */
export function ManaRichText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const tokens = splitManaTokens(text)
  if (!text) return <p className={className}>—</p>
  return (
    <p className={className}>
      {tokens.map((tok, i) =>
        tok.type === 'mana' ? (
          <ManaSymbol key={`${tok.value}-${i}`} code={tok.value} />
        ) : (
          <span key={`t-${i}`}>{tok.value}</span>
        ),
      )}
    </p>
  )
}
