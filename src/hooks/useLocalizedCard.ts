import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCardZh } from '../data/locale/cardsZh'
import type { DeckCard } from '../types'

export function useLocalizedCard(setCode: string, card: DeckCard) {
  const { i18n } = useTranslation()

  return useMemo(() => {
    if (!i18n.language.startsWith('zh')) {
      return {
        name: card.name,
        typeLine: card.typeLine,
        oracleText: card.oracleText,
      }
    }
    const zh = getCardZh(setCode, card.name)
    return {
      name: zh?.name ?? card.name,
      typeLine: zh?.typeLine ?? card.typeLine,
      oracleText: zh?.oracleText ?? card.oracleText,
    }
  }, [card, i18n.language, setCode])
}
