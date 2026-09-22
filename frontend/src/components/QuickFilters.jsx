import { CATEGORIES, COUNTRIES } from '../utils/format'
import { useI18n } from '../i18n'

const RANGE_IDS = ['1h', '6h', '24h']

export default function QuickFilters({ filters, onChange, sources = [] }) {
  const { t } = useI18n()
  const set = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="panel quick-filters">
      <div className="panel-title">{t('filters.title')}</div>
      <div className="filter-row">
        {RANGE_IDS.map((id) => (
          <button
            key={id}
            className={`chip${filters.range === id ? ' active' : ''}`}
            onClick={() => set('range', filters.range === id ? null : id)}
          >
            {t(`filters.${id}`)}
          </button>
        ))}
        <select value={filters.sumber || ''} onChange={(e) => set('sumber', e.target.value)}>
          <option value="">{t('filters.allSources')}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={filters.kategori || ''} onChange={(e) => set('kategori', e.target.value)}>
          <option value="">{t('filters.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.negara || ''} onChange={(e) => set('negara', e.target.value)}>
          <option value="">{t('filters.allCountries')}</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}