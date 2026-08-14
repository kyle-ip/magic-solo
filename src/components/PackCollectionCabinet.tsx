import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  clearCollected,
  collectionRarityStats,
  exportCollectionJson,
  importCollectionJson,
  listCollected,
  updateCollected,
  type CollectedCard,
} from '../data/packCollection'
import {
  filterAndSortCollection,
  uniqueSetCodes,
  type CollectionColorFilter,
  type CollectionRarityFilter,
  type CollectionSort,
} from '../data/packCollectionQuery'
import {
  enrichDrawnCardZh,
  hasZhPrint,
  wantsZh,
} from '../data/randomCard'
import { DrawnCardModal } from './DrawnCardModal'
import '../styles/pack.css'
import '../styles/deck.css'

type PackCollectionCabinetProps = {
  /** Called whenever the stored collection list changes. */
  onCollectionChange?: (items: CollectedCard[]) => void
}

/**
 * Shared collection cabinet (grid, filters, import/export, inspect).
 * Used by pack open and single-draw modals.
 */
export function PackCollectionCabinet({
  onCollectionChange,
}: PackCollectionCabinetProps) {
  const { t, i18n } = useTranslation()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [collection, setCollection] = useState<CollectedCard[]>(() =>
    listCollected(),
  )
  const [inspect, setInspect] = useState<CollectedCard | null>(null)
  const [filterRarity, setFilterRarity] =
    useState<CollectionRarityFilter>('all')
  const [filterColor, setFilterColor] =
    useState<CollectionColorFilter>('all')
  const [filterSet, setFilterSet] = useState('')
  const [sortBy, setSortBy] = useState<CollectionSort>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  useEffect(() => {
    setCollection(listCollected())
  }, [])

  const syncCollection = (items: CollectedCard[]) => {
    setCollection(items)
    onCollectionChange?.(items)
  }

  const filteredCollection = useMemo(
    () =>
      filterAndSortCollection(collection, {
        rarity: filterRarity,
        color: filterColor,
        setCode: filterSet,
        sort: sortBy,
        lang: i18n.language,
        query: searchQuery,
      }),
    [
      collection,
      filterRarity,
      filterColor,
      filterSet,
      sortBy,
      i18n.language,
      searchQuery,
    ],
  )
  const setOptions = uniqueSetCodes(collection)
  const rarityStats = collectionRarityStats(collection)

  const openInspect = (item: CollectedCard) => {
    setInspect(item)
    if (
      wantsZh() &&
      !hasZhPrint(item) &&
      item.oracleId &&
      item.source === 'scryfall'
    ) {
      void enrichDrawnCardZh(item).then((enriched) => {
        if (!hasZhPrint(enriched)) return
        const updated: CollectedCard = {
          ...enriched,
          collectedAt: item.collectedAt,
        }
        setInspect((cur) => (cur?.id === item.id ? updated : cur))
        syncCollection(updateCollected(enriched))
      })
    }
  }

  const downloadCollection = () => {
    const json = exportCollectionJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `magic-solo-collection-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const result = importCollectionJson(text)
      if (!result.ok) {
        setImportMessage(
          result.error === 'empty'
            ? t('packDraw.importEmpty')
            : t('packDraw.importInvalid'),
        )
        return
      }
      syncCollection(result.items)
      setImportMessage(
        t('packDraw.importOk', {
          added: result.added,
          updated: result.updated,
        }),
      )
    } catch {
      setImportMessage(t('packDraw.importInvalid'))
    }
  }

  const confirmClearCollection = () => {
    syncCollection(clearCollected())
    setInspect(null)
    setImportMessage(null)
    setClearConfirmOpen(false)
  }

  return (
    <>
      <div className="pack-collection">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            void onImportFile(file)
            e.target.value = ''
          }}
        />
        {collection.length === 0 ? (
          <div className="pack-collection-empty">
            <p className="pack-draw-hint">{t('packDraw.emptyCollection')}</p>
            <div className="pack-collection-manage">
              <button
                type="button"
                className="btn ghost"
                onClick={() => importInputRef.current?.click()}
              >
                {t('packDraw.import')}
              </button>
            </div>
            {importMessage ? (
              <p className="pack-draw-hint" role="status">
                {importMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className="pack-collection-stats"
              aria-label={t('packDraw.statsLabel')}
            >
              <span>{t('packDraw.statsTotal', { n: rarityStats.total })}</span>
              <span className="rarity-mythic">
                {t('packDraw.rarity.mythic')} {rarityStats.mythic}
              </span>
              <span className="rarity-rare">
                {t('packDraw.rarity.rare')} {rarityStats.rare}
              </span>
              <span className="rarity-uncommon">
                {t('packDraw.rarity.uncommon')} {rarityStats.uncommon}
              </span>
              <span className="rarity-common">
                {t('packDraw.rarity.common')} {rarityStats.common}
              </span>
              {rarityStats.other > 0 ? (
                <span>
                  {t('packDraw.statsOther', { n: rarityStats.other })}
                </span>
              ) : null}
            </div>
            <div className="pack-collection-toolbar">
              <label className="pack-collection-filter pack-collection-search">
                <span>{t('packDraw.search')}</span>
                <input
                  type="search"
                  value={searchQuery}
                  placeholder={t('packDraw.searchPlaceholder')}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <label className="pack-collection-filter">
                <span>{t('packDraw.filterRarity')}</span>
                <select
                  value={filterRarity}
                  onChange={(e) =>
                    setFilterRarity(e.target.value as CollectionRarityFilter)
                  }
                >
                  <option value="all">{t('packDraw.filterAll')}</option>
                  <option value="mythic">{t('packDraw.rarity.mythic')}</option>
                  <option value="rare">{t('packDraw.rarity.rare')}</option>
                  <option value="uncommon">
                    {t('packDraw.rarity.uncommon')}
                  </option>
                  <option value="common">{t('packDraw.rarity.common')}</option>
                </select>
              </label>
              <label className="pack-collection-filter">
                <span>{t('packDraw.filterColor')}</span>
                <select
                  value={filterColor}
                  onChange={(e) =>
                    setFilterColor(e.target.value as CollectionColorFilter)
                  }
                >
                  <option value="all">{t('packDraw.filterAll')}</option>
                  <option value="W">{t('packDraw.color.W')}</option>
                  <option value="U">{t('packDraw.color.U')}</option>
                  <option value="B">{t('packDraw.color.B')}</option>
                  <option value="R">{t('packDraw.color.R')}</option>
                  <option value="G">{t('packDraw.color.G')}</option>
                  <option value="C">{t('packDraw.color.C')}</option>
                  <option value="M">{t('packDraw.color.M')}</option>
                </select>
              </label>
              <label className="pack-collection-filter">
                <span>{t('packDraw.filterSet')}</span>
                <select
                  value={filterSet}
                  onChange={(e) => setFilterSet(e.target.value)}
                >
                  <option value="">{t('packDraw.filterAll')}</option>
                  {setOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pack-collection-filter">
                <span>{t('packDraw.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as CollectionSort)
                  }
                >
                  <option value="newest">{t('packDraw.sort.newest')}</option>
                  <option value="oldest">{t('packDraw.sort.oldest')}</option>
                  <option value="rarity">{t('packDraw.sort.rarity')}</option>
                  <option value="name">{t('packDraw.sort.name')}</option>
                  <option value="set">{t('packDraw.sort.set')}</option>
                </select>
              </label>
              <div className="pack-collection-filter pack-collection-actions">
                <span>{t('packDraw.manage')}</span>
                <div
                  className="pack-collection-manage"
                  role="group"
                  aria-label={t('packDraw.manage')}
                >
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={downloadCollection}
                  >
                    {t('packDraw.export')}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => importInputRef.current?.click()}
                  >
                    {t('packDraw.import')}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      if (collection.length === 0) return
                      setClearConfirmOpen(true)
                    }}
                  >
                    {t('packDraw.clearAll')}
                  </button>
                </div>
              </div>
            </div>
            {importMessage ? (
              <p className="pack-draw-hint" role="status">
                {importMessage}
              </p>
            ) : null}
            {filteredCollection.length === 0 ? (
              <p className="pack-draw-hint">{t('packDraw.filterEmpty')}</p>
            ) : (
              <ul className="pack-collection-grid">
                {filteredCollection.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="pack-collection-tile"
                      onClick={() => openInspect(item)}
                    >
                      <img src={item.frontImageUrl} alt={item.name} />
                      <span
                        className={`pack-rarity-chip rarity-${item.rarity}`}
                      >
                        {t(`packDraw.rarity.${item.rarity}`, {
                          defaultValue: item.rarity,
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {inspect ? (
        <DrawnCardModal
          card={inspect}
          cards={filteredCollection.length > 0 ? filteredCollection : collection}
          onSelect={(next) => {
            const found =
              (filteredCollection.length > 0
                ? filteredCollection
                : collection
              ).find((c) => c.id === next.id) ?? null
            if (found) openInspect(found)
          }}
          onClose={() => setInspect(null)}
        />
      ) : null}

      {clearConfirmOpen ? (
        <div
          className="pack-confirm-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setClearConfirmOpen(false)
          }}
        >
          <div
            className="pack-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pack-clear-title-shared"
            aria-describedby="pack-clear-desc-shared"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 id="pack-clear-title-shared">{t('packDraw.clearTitle')}</h3>
            <p id="pack-clear-desc-shared">
              {t('packDraw.clearConfirm', { n: collection.length })}
            </p>
            <div className="pack-draw-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setClearConfirmOpen(false)}
              >
                {t('packDraw.cancel')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={confirmClearCollection}
              >
                {t('packDraw.clearAll')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
