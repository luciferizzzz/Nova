import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrending } from '../services/api'
import { timeAgo, number, categoryClass, stripHtml } from '../utils/format'
import { useI18n } from '../i18n'

function rangeToHours(range) {
  const n = parseInt(String(range || '').replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 24
}

export default function TrendingPanel({ filters }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hours = rangeToHours(filters?.range)
  const params = {
    hours,
    ...(filters?.sumber && { sumber: filters.sumber }),
    ...(filters?.kategori && { kategori: filters.kategori }),
    ...(filters?.negara && { negara: filters.negara })
  }
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getTrending(params)
      .then((d) => {
        if (active) setData(d)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load trending')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  const events = data?.events || []

  return (
    <div className="panel trending-panel">
      <div className="trending-head">
        <div className="trending-head-text">
          <span className="trending-title">{t('trending.title')}</span>
          <span className="trending-subtitle">{t('trending.subtitle')}</span>
        </div>
        <span className="trending-window">{t('trending.window', { n: hours })}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && events.length === 0 ? (
        <div className="empty">{t('trending.loading')}</div>
      ) : events.length === 0 ? (
        <div className="empty">{t('trending.empty')}</div>
      ) : (
        <ol className="trending-list">
          {events.map((ev, i) => (
            <li key={ev.id} className="trending-item">
              <div className="trending-rank">{String(i + 1).padStart(2, '0')}</div>
              <div className="trending-body">
                <div className="trending-item-head">
                  <span className={`badge cat ${categoryClass(ev.category)}`}>
                    {ev.category || 'Other'}
                  </span>
                  <span className="trending-velocity">
                    {ev.velocity}
                    <span className="trending-velocity-unit">{t('trending.velocityUnit')}</span>
                  </span>
                </div>
                <div className="trending-event-title">{ev.title}</div>
                <div className="trending-meta">
                  <span>{t('trending.articles', { n: number(ev.recent_count) })}</span>
                  <span className="trending-dot">·</span>
                  <span>{t('trending.sources', { n: number(ev.source_count) })}</span>
                  <span className="trending-dot">·</span>
                  <span className="trending-updated">
                    {t('trending.updated', { ago: timeAgo(ev.last_at) })}
                  </span>
                </div>
                <div className="trending-headlines">
                  {ev.articles.map((a) => (
                    <div key={a.id} className="trending-headline">
                      <Link to={`/berita/${a.slug}`} className="trending-headline-link">
                        {stripHtml(a.judul)}
                      </Link>
                      <span className="trending-headline-meta">
                        {a.sumber} · {timeAgo(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
