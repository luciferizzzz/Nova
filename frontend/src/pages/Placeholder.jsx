import { useLocation } from 'react-router-dom'

const META = {
  '/map': { title: 'MAP VIEW', desc: 'Full geographic event map. Arrives in Phase 6 — Intelligence Features.' },
  '/timeline': { title: 'TIMELINE', desc: 'Chronological news monitoring. Arrives in Phase 6 — Intelligence Features.' },
  '/analytics': { title: 'ANALYTICS', desc: 'Local data visualization dashboard. Arrives in Phase 6 — Intelligence Features.' },
  '/tools/ai': { title: 'AI SUMMARY', desc: 'AI-powered summaries & topic analysis. Arrives in Phase 7 — AI Layer.' },
  '/tools/searches': { title: 'SAVED SEARCHES', desc: 'Reusable local search queries. Arrives in Phase 6 — Intelligence Features.' },
  '/tools/watchlist': { title: 'WATCHLIST', desc: 'Monitor topics and entities over time. Arrives in Phase 6 — Intelligence Features.' },
  '/tools/export': { title: 'EXPORT DATA', desc: 'Export news, bookmarks, searches & settings as JSON or CSV. Phase 5.' },
  '/tools/import': { title: 'IMPORT / EXPORT', desc: 'Move your local data between NOVA instances. Phase 5.' },
  '/categories': { title: 'CATEGORIES', desc: 'Browse news grouped by category.' },
  '/about': { title: 'ABOUT', desc: 'NOVA — Local News Intelligence System. Local data. Global information.' }
}

export default function Placeholder() {
  const { pathname } = useLocation()
  const meta = META[pathname] || { title: 'COMING SOON', desc: 'This feature is planned for a future phase.' }

  return (
    <div className="page">
      <div className="page-head">
        <h2>{meta.title}</h2>
      </div>
      <div className="empty panel">
        <div className="placeholder-badge">PHASE PLANNED</div>
        <p>{meta.desc}</p>
        <div className="page-hint">Core news UI is live — check Dashboard, All News, Sources and Bookmarks.</div>
      </div>
    </div>
  )
}