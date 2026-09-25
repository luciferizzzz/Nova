import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents, getEvent, scanEvents } from '../services/api'
import { timeAgo, number, categoryClass, stripHtml } from '../utils/format'
import { RefreshIcon } from '../components/icons'
import { useI18n } from '../i18n'

const EVENT_LEGEND = ['Conflict', 'Politics', 'Disaster', 'Economy', 'Technology', 'Other']

export default function Events() {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)

  function load() {
    setLoading(true)
    getEvents({ q: q || undefined, category: category || undefined, limit: 200 })
      .then((d) => {
        setData(d)
        setNotice('')
      })
      .catch(() => setNotice(t('events.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [q, category])

  async function handleScan() {
    setScanning(true)
    try {
      const r = await scanEvents()
      setNotice(t('events.scanned', { n: r.events, a: r.articles }))
      load()
    } catch {
      setNotice(t('events.loadError'))
    } finally {
      setScanning(false)
    }
  }

  async function toggleDetail(id) {
    if (expanded === id) {
      setExpanded(null)
      setDetail(null)
      return
    }
    try {
      const d = await getEvent(id)
      setDetail(d)
      setExpanded(id)
    } catch {
      setNotice(t('events.loadError'))
    }
  }

  const categories = data?.categories || []
  const events = data?.events || []

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('events.title')}</h2>
        <div className="page-head-actions">
          <span className="page-hint">
            {loading ? '…' : `${number(data?.total || 0)} ${t('events.total')}`}
          </span>
          <button className="apply-btn" onClick={handleScan} disabled={scanning}>
            <RefreshIcon size={12} /> {scanning ? t('events.scanning') : t('events.scan')}
          </button>
        </div>
      </div>

      <div className="panel filter-bar">
        <input
          className="finput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('events.searchPlaceholder')}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('events.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>
        <button className="reset-btn" onClick={() => { setQ(''); setCategory('') }}>
          {t('events.reset')}
        </button>
      </div>

      <div className="panel event-legend">
        <span className="event-legend-title">{t('events.legend')}</span>
        {EVENT_LEGEND.map((type) => (
          <span key={type} className="event-legend-item">
            <span className={`event-dot ${categoryClass(type)}`} />
            {type}
          </span>
        ))}
      </div>

      {notice && <div className="error-banner">{notice}</div>}

      {loading ? (
        <div className="empty panel">{t('events.loading')}</div>
      ) : events.length === 0 ? (
        <div className="empty panel">{t('events.empty')}</div>
      ) : (
        <div className="events-list">
          {events.map((ev) => (
            <div key={ev.id} className={`panel event-card${expanded === ev.id ? ' open' : ''}`}>
              <button className="event-card-head" onClick={() => toggleDetail(ev.id)}>
                <span className={`badge cat ${categoryClass(ev.category)}`}>{ev.category || 'Other'}</span>
                <span className="event-card-title">{ev.title}</span>
                <span className="event-card-count">{number(ev.article_count)} {t('events.articles')}</span>
                <span className="event-card-time">{timeAgo(ev.updated_at)}</span>
              </button>
              {expanded === ev.id && detail && detail.id === ev.id && (
                <div className="event-card-body">
                  {detail.description && <p className="event-desc">{detail.description}</p>}
                  <div className="event-members">
                    {detail.articles.map((a) => (
                      <div key={a.id} className="event-member">
                        <span className={`badge cat ${categoryClass(a.kategori)}`}>{a.kategori || 'Other'}</span>
                        <Link to={`/berita/${a.slug}`} className="event-member-link">
                          {stripHtml(a.judul)}
                        </Link>
                        <span className="event-member-meta">
                          {a.sumber} · {timeAgo(a.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}