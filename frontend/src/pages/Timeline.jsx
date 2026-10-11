import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTimeline, getSources, summarizeTimelineDay } from '../services/api'
import { number, timeAgo, categoryClass, stripHtml, CATEGORIES, COUNTRIES } from '../utils/format'
import { useI18n } from '../i18n'

const RANGE_PRESETS = [7, 14, 30, 90]

function dayLabel(day, lang) {
  const d = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString(lang, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

function dayBounds(day) {
  return { from: `${day}T00:00:00.000Z`, to: `${day}T23:59:59.999Z` }
}

export default function Timeline() {
  const { t, lang } = useI18n()
  const [sources, setSources] = useState([])
  const [days, setDays] = useState(30)
  const [kategori, setKategori] = useState('')
  const [negara, setNegara] = useState('')
  const [sumber, setSumber] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [tldr, setTldr] = useState({})
  const [tldrBusy, setTldrBusy] = useState(null)
  const [tldrError, setTldrError] = useState('')

  useEffect(() => {
    getSources().then(setSources).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getTimeline({ days, kategori: kategori || undefined, negara: negara || undefined, sumber: sumber || undefined })
      .then((d) => {
        if (!active) return
        setData(d)
        setError('')
      })
      .catch(() => active && setError(t('timeline.loadError')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [days, kategori, negara, sumber, t])

  const buckets = data?.days || []
  const peakCount = data?.peak?.count || 0
  const maxHour = useMemo(() => (data?.hours || []).reduce((m, h) => Math.max(m, h.count), 0), [data])
  const totalCategories = useMemo(
    () => (data?.categories || []).reduce((sum, c) => sum + c.count, 0),
    [data]
  )

  function reset() {
    setKategori('')
    setNegara('')
    setSumber('')
  }

  async function handleTldr(day) {
    setTldrBusy(day)
    setTldrError('')
    try {
      const r = await summarizeTimelineDay(day)
      if (r?.summary) {
        setTldr((prev) => ({ ...prev, [day]: { summary: r.summary, provider: r.provider, at: new Date().toISOString() } }))
        setTldrError(r.fallbackReason ? `${t('ai.fallbackNotice')} ${r.fallbackReason}` : '')
      } else {
        setTldrError(t('ai.disabledNotice'))
      }
    } catch (err) {
      setTldrError(err.message || t('timeline.loadError'))
    } finally {
      setTldrBusy(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('timeline.title')}</h2>
        <span className="page-hint">
          {loading
            ? t('timeline.loading')
            : `${number(data?.total || 0)} ${t('timeline.articles')} · ${data?.range?.from} → ${data?.range?.to}`}
        </span>
      </div>

      <div className="panel filter-bar">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {RANGE_PRESETS.map((d) => (
            <option key={d} value={d}>
              {t(`timeline.last${d}`)}
            </option>
          ))}
        </select>
        <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
          <option value="">{t('timeline.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={negara} onChange={(e) => setNegara(e.target.value)}>
          <option value="">{t('timeline.allCountries')}</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={sumber} onChange={(e) => setSumber(e.target.value)}>
          <option value="">{t('timeline.allSources')}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="reset-btn" onClick={reset}>
          {t('timeline.reset')}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {tldrError && <div className="error-banner">{tldrError}</div>}

      {loading && !data ? (
        <div className="empty panel">{t('timeline.loading')}</div>
      ) : buckets.length === 0 ? (
        <div className="empty panel">{t('timeline.empty')}</div>
      ) : (
        <>
          <div className="tl-summary">
            <div className="panel tl-tile">
              <span className="tl-tile-label">{t('timeline.inRange')}</span>
              <span className="tl-tile-value">{number(data.total)}</span>
            </div>
            <div className="panel tl-tile">
              <span className="tl-tile-label">{t('timeline.peakDay')}</span>
              <span className="tl-tile-value">{number(data.peak?.count || 0)}</span>
              <span className="tl-tile-sub">{data.peak ? dayLabel(data.peak.day, lang) : '—'}</span>
            </div>
            <div className="panel tl-tile">
              <span className="tl-tile-label">{t('timeline.activeDays')}</span>
              <span className="tl-tile-value">{number(buckets.length)}</span>
              <span className="tl-tile-sub">
                /{number(data.range.days)} {t('timeline.inWindow')}
              </span>
            </div>
          </div>

          <div className="tl-layout">
            <div className="tl-track">
              {buckets.map((d) => {
                const pct = peakCount ? Math.round((d.count / peakCount) * 100) : 0
                const isOpen = open === d.day
                const hidden = d.count - d.articles.length
                return (
                  <div key={d.day} className={`tl-day panel${isOpen ? ' open' : ''}`}>
                    <button
                      className="tl-day-head"
                      onClick={() => {
                        setOpen(isOpen ? null : d.day)
                        setTldrError('')
                      }}
                    >
                      <span className="tl-rail">
                        <span className="tl-node" />
                      </span>
                      <span className="tl-day-main">
                        <span className="tl-day-line">
                          <span className="tl-day-date">{dayLabel(d.day, lang)}</span>
                          <span className="tl-day-count">{number(d.count)}</span>
                        </span>
                        <span className="tl-day-bar">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                        <span className="tl-day-chips">
                          {d.categories
                            .slice()
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 5)
                            .map((c) => (
                              <span key={c.category} className={`badge cat ${categoryClass(c.category)}`}>
                                {c.category} {c.count}
                              </span>
                            ))}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="tl-day-body">
                        <div className="ai-summary-actions">
                          <button
                            className="btn-link"
                            onClick={() => handleTldr(d.day)}
                            disabled={tldrBusy === d.day}
                          >
                            {tldrBusy === d.day ? t('events.summarizing') : t('timeline.generateDailySummary')}
                          </button>
                        </div>
                        {tldr[d.day] && (
                          <div className="ai-summary">
                            <div className="ai-summary-title">{t('timeline.dailySummary')}</div>
                            <p className="ai-summary-text">{tldr[d.day].summary}</p>
                            <small className="ai-summary-meta">
                              {t('events.summaryGenerated')} {timeAgo(tldr[d.day].at)} ({tldr[d.day].provider})
                            </small>
                          </div>
                        )}
                        {d.sources.length > 0 && (
                          <div className="tl-day-sources">
                            {d.sources.map((s) => (
                              <span key={s.source} className="tl-source">
                                {s.source} <b>{s.count}</b>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="tl-articles">
                          {d.articles.map((a) => (
                            <Link key={a.id} to={`/berita/${a.slug}`} className="tl-article">
                              <span className={`badge cat ${categoryClass(a.kategori)}`}>
                                {a.kategori || 'Other'}
                              </span>
                              <span className="tl-article-title">{stripHtml(a.judul)}</span>
                              <span className="tl-article-meta">
                                {a.sumber} · {timeAgo(a.created_at)}
                              </span>
                            </Link>
                          ))}
                        </div>
                        {hidden > 0 && (
                          <Link className="tl-more" to={`/news?from=${dayBounds(d.day).from}&to=${dayBounds(d.day).to}`}>
                            {t('timeline.more', { n: number(hidden) })}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <aside className="tl-side">
              <div className="panel tl-panel">
                <div className="panel-title">{t('timeline.hours')}</div>
                <div className="tl-hours">
                  {data.hours.map((h) => (
                    <div key={h.hour} className="tl-hour" title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count}`}>
                      <span
                        className="tl-hour-bar"
                        style={{ height: `${maxHour ? Math.max(2, Math.round((h.count / maxHour) * 100)) : 2}%` }}
                      />
                      {h.hour % 6 === 0 && <span className="tl-hour-label">{String(h.hour).padStart(2, '0')}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel tl-panel">
                <div className="panel-title">{t('timeline.categoryMix')}</div>
                <div className="tl-mix">
                  {data.categories.map((c) => {
                    const share = totalCategories ? Math.round((c.count / totalCategories) * 100) : 0
                    return (
                      <div key={c.category} className="tl-mix-row">
                        <span className={`badge cat ${categoryClass(c.category)}`}>{c.category}</span>
                        <span className="tl-mix-bar">
                          <span
                            className={`tl-mix-fill ${categoryClass(c.category)}`}
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="tl-mix-count">{number(c.count)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
