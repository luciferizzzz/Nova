import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories } from '../services/api'
import { number, stripHtml, timeAgo, categoryClass } from '../utils/format'
import { useI18n } from '../i18n'
import Loading from '../components/Loading'

const RANGES = [7, 14, 30, 90]

function trendClass(n) {
  if (n > 0) return 'up'
  if (n < 0) return 'down'
  return 'flat'
}

function trendArrow(n) {
  if (n > 0) return '▲'
  if (n < 0) return '▼'
  return '—'
}

function Sparkline({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="wl-spark">
      {data.map((d) => (
        <div key={d.date} className="wl-spark-col" title={`${d.date}: ${d.count}`}>
          <div
            className="wl-spark-bar"
            style={{ height: `${Math.max(6, Math.round((d.count / max) * 100))}%` }}
          />
        </div>
      ))}
    </div>
  )
}

export default function Categories() {
  const { t } = useI18n()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    setExpanded(null)
    getCategories({ days, limit: 50 })
      .then((d) => {
        setData(d)
        setNotice('')
      })
      .catch((err) => setNotice(err.message || t('categories.loadError')))
      .finally(() => setLoading(false))
  }, [days, t])

  const cats = data?.categories || []
  const total = data?.articles || 0
  const toggle = (kategori) => setExpanded((cur) => (cur === kategori ? null : kategori))

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('categories.title')}</h2>
        <div className="head-actions">
          <span className="page-hint">
            {loading
              ? '…'
              : `${number(data?.total || 0)} ${t('categories.total')} · ${number(total)} ${t('categories.articles')}`}
          </span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map((d) => (
              <option key={d} value={d}>
                {t(`timeline.last${d}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="error-banner">{notice}</div>}

      {loading ? (
        <Loading text={t('categories.loading')} />
      ) : cats.length === 0 ? (
        <div className="empty panel">{t('categories.empty')}</div>
      ) : (
        <div className="cat-grid">
          {cats.map((c) => {
            const share = total ? Math.round((c.count / total) * 100) : 0
            const isOpen = expanded === c.kategori
            return (
              <div key={c.kategori} className={`panel cat-card${isOpen ? ' open' : ''}`}>
                <button className="cat-card-head" onClick={() => toggle(c.kategori)}>
                  <span className={`badge cat ${categoryClass(c.kategori)}`}>{c.kategori}</span>
                  <span className="cat-count">
                    {number(c.count)} <small>{t('categories.articles')}</small>
                  </span>
                  <span className={`cat-trend wl-trend ${trendClass(c.trend)}`}>
                    {trendArrow(c.trend)} {number(Math.abs(c.trend))}
                  </span>
                </button>

                <div className="cat-meta">
                  <span>
                    {share}% {t('categories.share')}
                  </span>
                  <span className="trending-dot">·</span>
                  <span>
                    {c.sources} {t('categories.sourcesLabel')}
                  </span>
                  <span className="trending-dot">·</span>
                  <span>
                    {c.countries} {t('categories.countries')}
                  </span>
                </div>

                <div className="cat-spark-wrap" title={t('categories.activity')}>
                  <Sparkline data={c.daily} />
                </div>

                {isOpen && (
                  <div className="cat-card-body">
                    <div className="wl-insights">
                      <div className="wl-col">
                        <div className="panel-title">{t('categories.topSources')}</div>
                        <div className="wl-chips">
                          {c.sourceList.map((s) => (
                            <span key={s.sumber} className="status-chip ok">
                              {s.sumber} · {s.count}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="wl-col">
                        <div className="panel-title">{t('categories.latest')}</div>
                        {c.headlines.length === 0 ? (
                          <div className="page-hint">{t('categories.noArticles')}</div>
                        ) : (
                          <ul className="wl-headlines">
                            {c.headlines.map((a) => (
                              <li key={a.id}>
                                <Link to={`/berita/${a.slug}`}>{stripHtml(a.judul)}</Link>
                                <span className="wl-headline-meta">
                                  {a.sumber} · {timeAgo(a.created_at)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <Link className="btn-link" to={`/news?kategori=${encodeURIComponent(c.kategori)}`}>
                      {t('categories.viewAll')}
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="page-hint" style={{ marginTop: 12 }}>
        {t('categories.footer')}
      </div>
    </div>
  )
}
