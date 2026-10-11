import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addWatchlistItem,
  deleteWatchlistItem,
  getWatchlist,
  getWatchlistInsights,
  summarizeWatchlistItem
} from '../services/api'
import { formatDate, number, timeAgo, stripHtml } from '../utils/format'
import { useI18n } from '../i18n'
import Loading from '../components/Loading'
import { PlusIcon, SearchIcon, TrashIcon } from '../components/icons'

const TYPES = ['topic', 'entity', 'keyword', 'source', 'category', 'country']

const EMPTY = { name: '', type: 'keyword', value: '' }

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

export default function Watchlist() {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [expanded, setExpanded] = useState(null)
  const [insights, setInsights] = useState({})
  const [loadingInsights, setLoadingInsights] = useState(null)
  const [summarizing, setSummarizing] = useState({})

  const load = useCallback(() => {
    getWatchlist()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name || !form.value) return setError(t('watch.needBoth'))
    setError('')
    try {
      await addWatchlistItem(form)
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('watch.remove'))) return
    try {
      await deleteWatchlistItem(id)
      if (expanded === id) setExpanded(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggle = async (w) => {
    if (expanded === w.id) {
      setExpanded(null)
      return
    }
    setExpanded(w.id)
    if (insights[w.id]) return
    setLoadingInsights(w.id)
    try {
      const r = await getWatchlistInsights(w.id)
      setInsights((prev) => ({ ...prev, [w.id]: r.insights }))
    } catch {
      setNotice(t('watch.insightsError'))
    } finally {
      setLoadingInsights(null)
    }
  }

  const handleSummarize = async (id) => {
    setSummarizing((s) => ({ ...s, [id]: true }))
    setNotice('')
    try {
      const r = await summarizeWatchlistItem(id)
      if (r?.item) {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...r.item } : it)))
        setNotice(r.fallbackReason ? `${t('ai.fallbackNotice')} ${r.fallbackReason}` : '')
      } else {
        setNotice(t('ai.disabledNotice'))
      }
    } catch (err) {
      setNotice(err.message || t('watch.insightsError'))
    } finally {
      setSummarizing((s) => ({ ...s, [id]: false }))
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('watch.title')}</h2>
        <div className="head-actions">
          <span className="page-hint">{t('watch.count', { n: items.length })}</span>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon /> {t('watch.add')}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice-banner">{notice}</div>}

      {showForm && (
        <div className="panel">
          <div className="panel-title">{t('watch.formTitle')}</div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                {t('watch.name')}
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AI regulation"
                />
              </label>
              <label>
                {t('watch.type')}
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                {t('watch.value')}
                <input
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="e.g. artificial intelligence"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {t('watch.submit')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                {t('watch.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty panel">{t('watch.empty')}</div>
      ) : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('searches.thName')}</th>
                <th>{t('watch.type')}</th>
                <th>{t('watch.value')}</th>
                <th>{t('watch.thArticles')}</th>
                <th>{t('searches.thCreated')}</th>
                <th className="right">{t('searches.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const ins = insights[w.id]
                const trend = ins?.trend ?? 0
                return (
                  <Fragment key={w.id}>
                    <tr>
                      <td>
                        <button className="wl-name-btn" onClick={() => toggle(w)}>
                          <span className={`wl-chevron${expanded === w.id ? ' open' : ''}`}>▸</span>
                          {w.name}
                          {w.insight_summary && <span className="wl-ai-dot" title={t('watch.digest')} />}
                        </button>
                      </td>
                      <td>
                        <span className="status-chip ok">{w.type}</span>
                      </td>
                      <td>
                        <Link className="src-url" to={`/search?q=${encodeURIComponent(w.value)}`}>
                          {w.value}
                        </Link>
                      </td>
                      <td>{number(w.count)}</td>
                      <td>{formatDate(w.created_at)}</td>
                      <td className="right">
                        <Link className="icon-btn" title="Run" to={`/search?q=${encodeURIComponent(w.value)}`}>
                          <SearchIcon />
                        </Link>
                        <button className="icon-btn danger" title={t('searches.thActions')} onClick={() => remove(w.id)}>
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                    {expanded === w.id && (
                      <tr className="wl-detail-row">
                        <td colSpan={6}>
                          {loadingInsights === w.id ? (
                            <Loading />
                          ) : ins ? (
                            <div className="wl-insights">
                              <div className="wl-metrics">
                                <div className="wl-metric">
                                  <span className="wl-metric-label">{t('watch.last24h')}</span>
                                  <span className="wl-metric-value">{number(ins.last24h)}</span>
                                  <span className={`wl-trend ${trendClass(trend)}`}>
                                    {trendArrow(trend)} {number(Math.abs(trend))}
                                  </span>
                                </div>
                                <div className="wl-metric">
                                  <span className="wl-metric-label">{t('watch.prev24h')}</span>
                                  <span className="wl-metric-value">{number(ins.prev24h)}</span>
                                </div>
                                <div className="wl-metric">
                                  <span className="wl-metric-label">{t('watch.total')}</span>
                                  <span className="wl-metric-value">{number(ins.total)}</span>
                                </div>
                              </div>

                              <div className="wl-col">
                                <div className="panel-title">{t('watch.last7d')}</div>
                                <Sparkline data={ins.daily} />
                              </div>

                              {ins.topSources.length > 0 && (
                                <div className="wl-col">
                                  <div className="panel-title">{t('watch.topSources')}</div>
                                  <div className="wl-chips">
                                    {ins.topSources.map((s) => (
                                      <span key={s.sumber} className="status-chip ok">
                                        {s.sumber} · {number(s.count)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="wl-col">
                                <div className="panel-title">{t('watch.latest')}</div>
                                {ins.latest.length === 0 ? (
                                  <div className="page-hint">{t('watch.noArticles')}</div>
                                ) : (
                                  <ul className="wl-headlines">
                                    {ins.latest.map((a) => (
                                      <li key={a.id}>
                                        <Link to={`/berita/${a.slug}`}>{stripHtml(a.judul)}</Link>
                                        <span className="wl-headline-meta">
                                          {a.sumber} · {timeAgo(a.created_at)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <Link className="btn-link" to={`/search?q=${encodeURIComponent(w.value)}`}>
                                  {t('watch.viewAll')}
                                </Link>
                              </div>

                              <div className="wl-col">
                                <div className="panel-title">{t('watch.digest')}</div>
                                {w.insight_summary ? (
                                  <div className="ai-summary">
                                    <p className="ai-summary-text">{w.insight_summary}</p>
                                    {w.insight_generated_at && (
                                      <small className="ai-summary-meta">
                                        {t('watch.digestGenerated')} {timeAgo(w.insight_generated_at)}
                                        {w.insight_provider ? ` (${w.insight_provider})` : ''}
                                      </small>
                                    )}
                                  </div>
                                ) : (
                                  <div className="page-hint">{t('watch.noDigest')}</div>
                                )}
                                <div className="ai-summary-actions">
                                  <button
                                    className="btn-link"
                                    onClick={() => handleSummarize(w.id)}
                                    disabled={!!summarizing[w.id]}
                                  >
                                    {summarizing[w.id] ? t('watch.generating') : t('watch.generateDigest')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="page-hint">{t('watch.noArticles')}</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="page-hint" style={{ marginTop: 12 }}>
        {t('watch.footer')}
      </div>
    </div>
  )
}
