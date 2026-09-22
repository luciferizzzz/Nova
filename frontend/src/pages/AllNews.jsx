import { useEffect, useState } from 'react'
import NewsCard from '../components/NewsCard'
import { FeedSkeleton, default as Loading } from '../components/Loading'
import useFeed from '../hooks/useFeed'
import { getSources } from '../services/api'
import { lastHoursISO, CATEGORIES, COUNTRIES } from '../utils/format'

const RANGES = [
  { id: '1h', label: 'Last 1 Hour', hours: 1 },
  { id: '6h', label: 'Last 6 Hours', hours: 6 },
  { id: '24h', label: 'Last 24 Hours', hours: 24 }
]

export default function AllNews() {
  const [sources, setSources] = useState([])
  const [local, setLocal] = useState({
    q: '',
    sumber: '',
    kategori: '',
    negara: '',
    range: ''
  })
  const [active, setActive] = useState(false)

  useEffect(() => {
    getSources().then(setSources).catch(() => {})
  }, [])

  const params = active
    ? {
        q: local.q || undefined,
        sumber: local.sumber || undefined,
        kategori: local.kategori || undefined,
        negara: local.negara || undefined,
        from: local.range ? lastHoursISO(local.range) : undefined
      }
    : {}

  const feed = useFeed(params)

  return (
    <div className="page">
      <div className="page-head">
        <h2>ALL NEWS</h2>
        <span className="page-hint">
          {feed.items.length} shown{active ? ' · filters applied' : ''}
        </span>
      </div>

      <div className="panel filter-bar">
        <input
          className="finput"
          value={local.q}
          onChange={(e) => setLocal({ ...local, q: e.target.value })}
          placeholder="Search in all news..."
        />
        <select value={local.sumber} onChange={(e) => setLocal({ ...local, sumber: e.target.value })}>
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={local.kategori} onChange={(e) => setLocal({ ...local, kategori: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={local.negara} onChange={(e) => setLocal({ ...local, negara: e.target.value })}>
          <option value="">All Countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={local.range} onChange={(e) => setLocal({ ...local, range: e.target.value })}>
          <option value="">Any time</option>
          {RANGES.map((r) => (
            <option key={r.id} value={r.hours}>
              {r.label}
            </option>
          ))}
        </select>
        <button className="apply-btn" onClick={() => setActive(true)}>
          APPLY
        </button>
        <button className="reset-btn" onClick={() => { setLocal({ q: '', sumber: '', kategori: '', negara: '', range: '' }); setActive(false) }}>
          RESET
        </button>
      </div>

      {feed.error && <div className="error-banner">{feed.error}</div>}
      {feed.loading && feed.items.length === 0 ? (
        <FeedSkeleton count={4} />
      ) : feed.items.length === 0 ? (
        <div className="empty panel">No news found for the selected filters.</div>
      ) : (
        <div className="news-grid">
          {feed.items.map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      )}
      {feed.loading && feed.items.length > 0 && <Loading text="Loading more…" />}
      {feed.hasMore && !feed.loading && (
        <button className="load-more" onClick={feed.loadMore}>
          LOAD MORE
        </button>
      )}
    </div>
  )
}