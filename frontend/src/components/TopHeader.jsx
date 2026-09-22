import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchIcon, GearIcon, MoonIcon, SunIcon } from './icons'
import { useI18n } from '../i18n'

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('nova-theme') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('nova-theme', theme)
  }, [theme])
  return [theme, setTheme]
}

export default function TopHeader() {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { t } = useI18n()
  const [theme, setTheme] = useTheme()
  const [q, setQ] = useState('')

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