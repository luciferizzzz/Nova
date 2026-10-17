import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsSummary } from '../services/api'
import { number, timeAgo, categoryClass, stripHtml } from '../utils/format'
import { useI18n } from '../i18n'
import Loading from '../components/Loading'
import StatCard from '../components/StatCard'

// Jendela velocity (Fitur B) dalam jam dan rentang kategori (Fitur C) dalam hari
// dipilih terpisah, mengikuti satuan masing-masing halaman asal.
const HOUR_OPTIONS = [
  { h: 6, key: 'analytics.last6h' },
  { h: 24, key: 'analytics.last24h' },
  { h: 72, key: 'analytics.last3d' },
  { h: 168, key: 'analytics.last7d' }
]

const DAY_OPTIONS = [7, 14, 30, 90]

const DAY_KEYS = { 7: 'timeline.last7', 14: 'timeline.last14', 30: 'timeline.last30', 90: 'timeline.last90' }

export default function Analytics() {
  const { t } = useI18n()
  const [hours, setHours] = useState(24)
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getAnalyticsSummary({ hours, days, limit: 8 })
      .then((d) => {
        if (!active) return
        setData(d)
        setNotice('')
      })
      .catch((err) => {
        if (active) setNotice(err.message || t('analytics.loadError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [hours, days, t])

  const totals = data?.totals || {}
  const corr = data?.corroboration || { events: 0, articles: 0, coveragePct: 0, top: [] }
  const trending = data?.trending || []
  const cats = data?.categories?.items || []
  const catTotal = data?.categories?.articles || 0

  const statCards = [
    { label: t('stats.articles'), value: number(totals.articles) },
    { label: t('stats.events'), value: number(totals.events) },
    { label: t('stats.sources'), value: number(totals.sources) },
    { label: t('stats.countries'), value: number(totals.countries) },
    { label: t('analytics.corroborated'), value: `${corr.coveragePct}%`, sub: t('analytics.coverageSub') }
  ]

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('analytics.title')}</h2>
        <div className="head-actions">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            title={t('analytics.trendingWindow')}
          >
            {HOUR_OPTIONS.map((o) => (
              <option key={o.h} value={o.h}>
                {t(o.key)}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            title={t('analytics.categoryRange')}
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t(DAY_KEYS[d])}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="error-banner">{notice}</div>}

      {loading && !data ? (
        <Loading text={t('analytics.loading')} />
      ) : (
        <>
          <section className="stats-row">
            {statCards.map((c, i) => (
              <StatCard key={i} {...c} />
            ))}
          </section>

          <section className="panel ana-panel">
            <div className="ana-panel-head">
              <span className="ana-panel-title">{t('analytics.corroborationTitle')}</span>
              <span className="ana-panel-sub">{t('analytics.corroborationSub')}</span>
            </div>

            <div className="ana-coverage">
              <div className="ana-coverage-num">{corr.coveragePct}%</div>
              <div className="ana-coverage-body">
                <div className="ana-bar">
                  <div
                    className="ana-bar-fill"
                    style={{ width: `${Math.min(100, corr.coveragePct)}%` }}
                  />
                </div>
                <div className="ana-coverage-meta">
                  {t('analytics.corroborationMeta', {
                    events: number(corr.events),
                    articles: number(corr.articles)
                  })}
                </div>
              </div>
            </div>

            {corr.top.length > 0 && (
              <div className="ana-block">
                <div className="ana-block-title">{t('analytics.topCorroborated')}</div>
                <ul className="ana-list">
                  {corr.top.map((ev) => (
                    <li key={ev.id} className="ana-list-item">
                      <span className={`badge cat ${categoryClass(ev.category)}`}>
                        {ev.category || 'Other'}
                      </span>
                      {ev.sample_slug ? (
                        <Link className="ana-list-link" to={`/berita/${ev.sample_slug}`}>
                          {stripHtml(ev.title)}
                        </Link>
                      ) : (
                        <span className="ana-list-link">{stripHtml(ev.title)}</span>
                      )}
                      <span className="ana-list-meta">
                        {t('analytics.sourcesCount', { n: number(ev.source_count) })}
                        <span className="trending-dot">·</span>
                        {t('analytics.articlesCount', { n: number(ev.article_count) })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="ana-grid">
            <div className="panel ana-panel">
              <div className="ana-panel-head">
                <span className="ana-panel-title">{t('analytics.trendingTitle')}</span>
                <span className="ana-panel-sub">{t('analytics.trendingSub')}</span>
              </div>

              {trending.length === 0 ? (
                <div className="empty">{t('analytics.trendingEmpty')}</div>
              ) : (
                <ol className="ana-list ana-list-ranked">
                  {trending.map((ev, i) => (
                    <li key={ev.id} className="ana-list-item">
                      <span className="ana-rank">{String(i + 1).padStart(2, '0')}</span>
                      <div className="ana-list-body">
                        <div className="ana-list-topline">
                          <span className={`badge cat ${categoryClass(ev.category)}`}>
                            {ev.category || 'Other'}
                          </span>
                          <span className="ana-velocity">
                            {ev.velocity}
                            <span className="ana-velocity-unit">{t('trending.velocityUnit')}</span>
                          </span>
                        </div>
                        <div className="ana-event-title">{stripHtml(ev.title)}</div>
                        <div className="ana-list-meta">
                          {t('trending.articles', { n: number(ev.recent_count) })}
                          <span className="trending-dot">·</span>
                          {t('trending.sources', { n: number(ev.source_count) })}
                          <span className="trending-dot">·</span>
                          {t('trending.updated', { ago: timeAgo(ev.last_at) })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="panel ana-panel">
              <div className="ana-panel-head">
                <span className="ana-panel-title">{t('analytics.categoriesTitle')}</span>
                <span className="ana-panel-sub">{t('analytics.categoriesSub')}</span>
              </div>

              {cats.length === 0 ? (
                <div className="empty">{t('analytics.categoriesEmpty')}</div>
              ) : (
                <div className="ana-cats">
                  {cats.map((c) => {
                    const share = catTotal ? Math.round((c.count / catTotal) * 100) : 0
                    return (
                      <div key={c.kategori} className="ana-cat-row">
                        <Link
                          className="ana-cat-label"
                          to={`/news?kategori=${encodeURIComponent(c.kategori)}`}
                        >
                          <span className={`badge cat ${categoryClass(c.kategori)}`}>{c.kategori}</span>
                        </Link>
                        <div className="ana-bar ana-bar-sm">
                          <div className="ana-bar-fill" style={{ width: `${share}%` }} />
                        </div>
                        <span className="ana-cat-count">{number(c.count)}</span>
                        <span className="ana-cat-share">{share}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <div className="page-hint" style={{ marginTop: 12 }}>
            {t('analytics.footer')}
          </div>
        </>
      )}
    </div>
  )
}
