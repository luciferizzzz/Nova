import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTopics, summarizeTopic } from '../services/api'
import { number, stripHtml, timeAgo } from '../utils/format'
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

export default function Topics() {
  const { t } = useI18n()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [digests, setDigests] = useState({})
  const [summarizing, setSummarizing] = useState({})

  useEffect(() => {
    setLoading(true)
    setExpanded(null)
    getTopics({ days, limit: 20 })
      .then((d) => {
        setData(d)
        setNotice('')
      })
      .catch(() => setNotice(t('topics.loadError')))
      .finally(() => setLoading(false))
  }, [days, t])

  const toggle = (term) => setExpanded((cur) => (cur === term ? null : term))

  const handleDigest = async (term) => {
    setSummarizing((s) => ({ ...s, [term]: true }))
    setNotice('')
    try {
      const r = await summarizeTopic(term)
      if (r?.ok) {
        setDigests((d) => ({ ...d, [term]: { summary: r.summary, provider: r.provider } }))
        if (r.fallbackReason) setNotice(`${t('ai.fallbackNotice')} ${r.fallbackReason}`)
      } else {
        setNotice(t('ai.disabledNotice'))
      }
    } catch (err) {
      setNotice(err.message || t('topics.loadError'))
    } finally {
      setSummarizing((s) => ({ ...s, [term]: false }))
    }
  }

  const topics = data?.topics || []

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('topics.title')}</h2>
        <div className="head-actions">
          <span className="page-hint">
            {loading ? '…' : `${number(data?.total || 0)} ${t('topics.total')}`}
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
        <Loading text={t('topics.loading')} />
      ) : topics.length === 0 ? (
        <div className="empty panel">{t('topics.empty')}</div>
      ) : (
        <div className="events-list">
          {topics.map((tp) => {
            const dg = digests[tp.term]
            return (
              <div key={tp.term} className={`panel event-card${expanded === tp.term ? ' open' : ''}`}>
                <button className="event-card-head" onClick={() => toggle(tp.term)}>
                  <span className="topic-term">{tp.term}</span>
                  <span className="event-card-count">
                    {number(tp.count)} {t('topics.articles')}
                  </span>
                  <span className="event-card-count">
                    {tp.sources} {t('topics.sourcesLabel')}
                  </span>
                  <span className={`wl-trend ${trendClass(tp.trend)}`}>
                    {trendArrow(tp.trend)} {number(Math.abs(tp.trend))}
                  </span>
                </button>

                {expanded === tp.term && (
                  <div className="event-card-body">
                    <div className="wl-insights">
                      <div className="wl-col">
                        <div className="panel-title">{t('topics.activity')}</div>
                        <Sparkline data={tp.daily} />
                        <div className="page-hint">{t('topics.trend')}</div>
                      </div>

                      <div className="wl-col">
                        <div className="panel-title">{t('watch.topSources')}</div>
                        <div className="wl-chips">
                          {tp.sourceList.map((s) => (
                            <span key={s} className="status-chip ok">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="wl-col">
                        <div className="panel-title">{t('watch.latest')}</div>
                        {tp.headlines.length === 0 ? (
                          <div className="page-hint">{t('watch.noArticles')}</div>
                        ) : (
                          <ul className="wl-headlines">
                            {tp.headlines.map((a) => (
                              <li key={a.id}>
                                <Link to={`/berita/${a.slug}`}>{stripHtml(a.judul)}</Link>
                                <span className="wl-headline-meta">
                                  {a.sumber} · {timeAgo(a.created_at)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link className="btn-link" to={`/search?q=${encodeURIComponent(tp.term)}`}>
                          {t('watch.viewAll')}
                        </Link>
                      </div>

                      <div className="wl-col">
                        <div className="panel-title">{t('topics.digest')}</div>
                        {dg ? (
                          <div className="ai-summary">
                            <p className="ai-summary-text">{dg.summary}</p>
                            <small className="ai-summary-meta">({dg.provider})</small>
                          </div>
                        ) : (
                          <div className="page-hint">{t('topics.noDigest')}</div>
                        )}
                        <div className="ai-summary-actions">
                          <button
                            className="btn-link"
                            onClick={() => handleDigest(tp.term)}
                            disabled={!!summarizing[tp.term]}
                          >
                            {summarizing[tp.term] ? t('topics.generating') : t('topics.generateDigest')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="page-hint" style={{ marginTop: 12 }}>
        {t('topics.footer')}
      </div>
    </div>
  )
}
