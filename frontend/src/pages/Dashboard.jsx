import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import NewsTabs from '../components/NewsTabs'
import QuickFilters from '../components/QuickFilters'
import NewsCard from '../components/NewsCard'
import TopStories from '../components/TopStories'
import GlobePanel from '../components/GlobePanel'
import { FeedSkeleton, default as Loading } from '../components/Loading'
import useFeed from '../hooks/useFeed'
import { getStats, getSources, getBerita } from '../services/api'
import { timeAgo, number, lastHoursISO } from '../utils/format'
import { useI18n } from '../i18n'

const TAB_PARAMS = {
  latest: {},
  trending: { from: lastHoursISO(24) },
  local: { negara: 'Indonesia' },
  world: { kategori: 'World' },
  technology: { kategori: 'Technology' },
  business: { kategori: 'Business' },
  science: { kategori: 'Science' }
}

function buildParams(tab, filters) {
  const base = { ...(TAB_PARAMS[tab] || {}) }
  if (filters.range) base.from = lastHoursISO(filters.range)
  if (filters.sumber) base.sumber = filters.sumber
  if (filters.kategori) base.kategori = filters.kategori
  if (filters.negara) base.negara = filters.negara
  return base
}

export default function Dashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [sources, setSources] = useState([])
  const [stories, setStories] = useState([])
  const [tab, setTab] = useState('latest')
  const [filters, setFilters] = useState({ range: null, sumber: '', kategori: '', negara: '' })

  const params = buildParams(tab, filters)
  const feed = useFeed(params)

  useEffect(() => {
    getStats().then(setStats).catch(() => {})
    getSources().then(setSources).catch(() => {})
    getBerita({ limit: 4 }).then(setStories).catch(() => {})
  }, [])

  const statCards = stats
    ? [
        { label: t('stats.articles'), value: number(stats.articles), sub: `+${number(stats.today)} ${t('stats.today')}` },
        { label: t('stats.sources'), value: number(stats.sourcesActive), sub: `${stats.sourcesActive} ${t('stats.activeFeeds')}` },
        { label: t('stats.events'), value: number(stats.events), sub: t('stats.liveUpdates') },
        { label: t('stats.countries'), value: number(stats.countries), sub: t('stats.inCoverage') },
        { label: t('stats.lastUpdate'), value: '—', sub: stats.lastUpdate ? `${timeAgo(stats.lastUpdate)} · ${t('stats.autoRefresh')}` : t('stats.autoRefresh') }
      ]
    : []

  return (
    <div className="page dashboard-page">
      <section className="stats-row">
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </section>

      <section className="dash-main">
        <div className="dash-center">
          <GlobePanel />
          <NewsTabs active={tab} onChange={setTab} />
          <QuickFilters filters={filters} onChange={setFilters} sources={sources} />
          {feed.error && <div className="error-banner">{feed.error}</div>}
          {feed.loading && feed.items.length === 0 ? (
            <FeedSkeleton count={4} />
          ) : feed.items.length === 0 ? (
            <div className="empty panel">{t('feed.noNews')}</div>
          ) : (
            <div className="news-grid">
              {feed.items.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          )}
          {feed.loading && feed.items.length > 0 && <Loading text={t('feed.loadingMore')} />}
          {feed.hasMore && !feed.loading && (
            <button className="load-more" onClick={feed.loadMore}>
              {t('feed.loadMore')}
            </button>
          )}
        </div>
        <TopStories stories={stories} />
      </section>
    </div>
  )
}