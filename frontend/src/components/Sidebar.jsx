import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStats } from '../services/api'
import { number, formatBytes } from '../utils/format'
import { useI18n } from '../i18n'
import { LogoutIcon } from './icons'

export default function Sidebar() {
  const { logout } = useAuth()
  const { t } = useI18n()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  const NAV = [
    {
      group: null,
      items: [
        { to: '/', key: 'nav.dashboard' },
        { to: '/news', key: 'nav.allNews' },
        { to: '/bookmarks', key: 'nav.bookmarks' },
        { to: '/categories', key: 'nav.categories' },
        { to: '/events', key: 'nav.events' },
        { to: '/sources', key: 'nav.sources' },
        { to: '/map', key: 'nav.mapView' },
        { to: '/timeline', key: 'nav.timeline' },
        { to: '/analytics', key: 'nav.analytics' }
      ]
    },
    {
      group: 'nav.tools',
      items: [
        { to: '/tools/ai', key: 'nav.aiSummary' },
        { to: '/tools/searches', key: 'nav.savedSearches' },
        { to: '/tools/watchlist', key: 'nav.watchlist' },
        { to: '/tools/export', key: 'nav.exportData' }
      ]
    },
    {
      group: 'nav.system',
      items: [
        { to: '/settings', key: 'nav.settings' },
        { to: '/tools/import', key: 'nav.importExport' },
        { to: '/about', key: 'nav.about' }
      ]
    }
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-name">NOVA</div>
        <div className="brand-sub">LOCAL NEWS INTELLIGENCE</div>
      </div>

      <nav className="nav">
        {NAV.map((section, i) => (
          <div className="nav-section" key={i}>
            {section.group && <div className="nav-group">{t(section.group)}</div>}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-dot" />
                {t(item.key)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="storage">
          <div className="storage-label">{t('nav.storage')}</div>
          {stats ? (
            <>
              <div className="storage-used">
                {formatBytes(stats.dbSize)} {t('storage.used')}
              </div>
              <div className="storage-art">{number(stats.articles)} {t('storage.indexed')}</div>
            </>
          ) : (
            <div className="storage-used">—</div>
          )}
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogoutIcon /> {t('logout')}
        </button>
      </div>
    </aside>
  )
}