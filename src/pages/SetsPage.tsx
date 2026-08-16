import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  filterGallerySets,
  gallerySetYears,
  loadGallerySets,
  sortGallerySets,
  type GallerySet,
  type GallerySetSort,
} from '../data/setApi'
import { SET_TYPE_FILTERS, type IncludedSetType } from '../data/setConfig'
import { localizedSetName } from '../data/locale/setNamesZh'
import {
  NlAiFilterChip,
  NlScryfallSearch,
} from '../components/NlScryfallSearch'
import '../styles/sets.css'
import '../styles/cursors.css'

const SORT_OPTIONS: GallerySetSort[] = [
  'release-desc',
  'release-asc',
  'name-asc',
  'name-desc',
]

export function SetsPage() {
  const { t, i18n } = useTranslation()
  const [sets, setSets] = useState<GallerySet[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<IncludedSetType | 'all'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<GallerySetSort>('release-desc')
  const [year, setYear] = useState<number | 'all'>('all')
  const [useAi, setUseAi] = useState(false)
  const onUseAiChange = useCallback((on: boolean) => setUseAi(on), [])

  const reload = () => {
    setLoading(true)
    setError(null)
    void loadGallerySets()
      .then((rows) => {
        setSets(rows)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setSets(null)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }

  useEffect(() => {
    reload()
  }, [])

  const years = useMemo(() => (sets ? gallerySetYears(sets) : []), [sets])

  const filtered = useMemo(() => {
    if (!sets) return []
    const nameOf = (s: GallerySet) =>
      localizedSetName(s.code, s.name, i18n.language)
    const rows = filterGallerySets(sets, { type, q, year })
    return sortGallerySets(rows, sort, nameOf, i18n.language)
  }, [sets, type, q, year, sort, i18n.language])

  return (
    <main className="page sets-page">
      <header className="sets-hero">
        <h1>{t('sets.title')}</h1>
        <p className="lede">{t('sets.lead')}</p>
      </header>

      <div className={`sets-toolbar${useAi ? ' is-ai-search' : ''}`}>
        <div
          className="sets-type-filters-group"
          role="tablist"
          aria-label={t('sets.filterLabel')}
        >
          {SET_TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={type === f}
              className={`sets-type-chip${type === f ? ' is-active' : ''}`}
              onClick={() => setType(f)}
            >
              {t(`sets.type.${f}`)}
            </button>
          ))}
        </div>
        <NlAiFilterChip
          active={useAi}
          onToggle={() => setUseAi((v) => !v)}
        />

        <label className="sets-select sets-select-year">
          <span className="visually-hidden">{t('sets.yearLabel')}</span>
          <select
            value={year === 'all' ? 'all' : String(year)}
            onChange={(e) => {
              const v = e.target.value
              setYear(v === 'all' ? 'all' : Number(v))
            }}
            aria-label={t('sets.yearLabel')}
          >
            <option value="all">{t('sets.yearAll')}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {t('sets.yearOption', { year: y })}
              </option>
            ))}
          </select>
        </label>

        <label className="sets-select sets-select-sort">
          <span className="visually-hidden">{t('sets.sortLabel')}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as GallerySetSort)}
            aria-label={t('sets.sortLabel')}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`sets.sort.${opt}`)}
              </option>
            ))}
          </select>
        </label>

        <NlScryfallSearch
          mode="sets-filter"
          value={q}
          onChange={setQ}
          placeholder={t('sets.searchPlaceholder')}
          label={t('sets.searchLabel')}
          useAi={useAi}
          onUseAiChange={onUseAiChange}
        />
      </div>

      {!loading && !error && sets ? (
        <p className="sets-count" role="status">
          {filtered.length === sets.length
            ? t('sets.countAll', { count: sets.length })
            : t('sets.countFiltered', {
                shown: filtered.length,
                total: sets.length,
              })}
        </p>
      ) : null}

      {loading ? <p className="sets-status">{t('sets.loading')}</p> : null}
      {error ? (
        <div className="sets-status sets-error">
          <p>{t('sets.error', { message: error })}</p>
          <button type="button" className="btn ghost" onClick={reload}>
            {t('sets.retry')}
          </button>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="sets-status">{t('sets.empty')}</p>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <ul className="sets-grid">
          {filtered.map((set) => {
            const name = localizedSetName(set.code, set.name, i18n.language)
            return (
              <li key={set.code}>
                <Link to={`/sets/${set.code}`} className="sets-card">
                  <span className="sets-card-icon" aria-hidden="true">
                    {set.iconSvgUri ? (
                      <img src={set.iconSvgUri} alt="" loading="lazy" />
                    ) : (
                      <span className="sets-card-icon-fallback">
                        {set.code.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="sets-card-body">
                    <span className="sets-card-meta">
                      {t(`sets.type.${set.setType}`, {
                        defaultValue: set.setType,
                      })}{' '}
                      · {set.code.toUpperCase()}
                    </span>
                    <strong className="sets-card-name">{name}</strong>
                    <span className="sets-card-footer">
                      {set.releasedAt
                        ? t('sets.released', { date: set.releasedAt })
                        : null}
                      <em>
                        {t('sets.cardCount', { count: set.cardCount })}
                      </em>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </main>
  )
}
