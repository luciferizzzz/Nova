import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchIcon, GearIcon, MoonIcon, SunIcon } from './icons'
import { useI18n } from '../i18n'
import { applyTheme, loadTheme } from '../utils/theme'
import { useLiveUpdates } from '../context/LiveUpdatesContext'

function useTheme() {
  const [theme, setTheme] = useState(() => loadTheme().theme)
  const [accent] = useState(() => loadTheme().accent)
  useEffect(() => {
    applyTheme(theme, accent)
  }, [theme, accent])
  return [theme, setTheme]
}

export default function TopHeader() {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { t } = useI18n()
  const [theme, setTheme] = useTheme()
  const [q, setQ] = useState('')
  const live = useLiveUpdates()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === '/') {
        const tag = document.activeElement?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const liveParts = []
  if (live.newCount > 0) {
    liveParts.push(
      live.awayCount > 0
        ? t('header.awayArticles', { n: live.awayCount })
        : t('header.newArticles', { n: live.newCount })
    )
  }
  if (live.failedSources.length > 0) {
    liveParts.push(t('header.sourcesFailed', { n: live.failedSources.length }))
  }

  // Acknowledge the badge and ask the active page to reload with the newest data.
  const openNewArticles = () => {
    live.clear()
    live.requestRefresh()
    navigate('/')
  }

  return (
    <header className="top-header">
      <form className="search-box" onSubmit={submit}>
        <SearchIcon />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label="Search"
        />
        <kbd>Ctrl K</kbd>
      </form>

      <div className="header-right">
        <span className="local-badge" title="All data is stored locally">
          <span className="pulse" />
          {t('header.localhostMode')}
        </span>
        {live.newCount > 0 && (
          <button
            type="button"
            className="live-badge"
            onClick={openNewArticles}
            title={liveParts.join(' · ')}
            aria-live="polite"
          >
            <span className="live-badge-dot" />
            ↑ {live.newCount}
          </button>
        )}
        <button
          className="icon-btn theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={t('header.toggleTheme')}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <Link className="icon-btn" to="/settings" title={t('header.settings')}>
          <GearIcon />
        </Link>
      </div>
    </header>
  )
}