import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { saveSearch, searchBerita } from '../services/api'
import NewsCard from '../components/NewsCard'
import { useI18n } from '../i18n'
import { FeedSkeleton, default as Loading } from '../components/Loading'

export default function Search() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setParams({ q: trimmed })
    setSaveMsg('')
  }

  useEffect(() => {
    if (!q) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setError('')
    setSaveMsg('')
    searchBerita(q, 60)
      .then((data) => {
        setResults(data)
        setSearched(true)
      })
      .catch((err) => setError(err.message || 'Search failed'))
      .finally(() => setLoading(false))
  }, [q])

  const current = () => {
    const s = input.trim()
    return s ? s : q
  }

  const save = async () => {
    const query = current()
    if (!query) return
    setSaveMsg('')
    try {
      await saveSearch(query, query)
      setSaveMsg(t('searches.saved', { q: query }))
    } catch (err) {
      setSaveMsg(err.message)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>SEARCH</h2>
        <span className="page-hint">⌘K / Ctrl K anywhere to jump here</span>
      </div>

      <form className="search-page-form" onSubmit={submit}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search news, topics, entities..."
        />
        <button type="submit">SEARCH</button>
      </form>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <FeedSkeleton count={3} />
      ) : !q ? (
        <div className="empty panel">Type a query above to search local news.</div>
      ) : (
        <>
          <div className="page-hint" style={{ margin: '12px 0' }}>
            {searched && `${results.length} result${results.length === 1 ? '' : 's'} for "${q}"`}
          </div>
          {results.length > 0 && (
            <div className="search-actions">
              <button className="btn-primary" onClick={save}>
                {t('searches.submit')}
              </button>
              {saveMsg && <span className="page-hint">{saveMsg}</span>}
            </div>
          )}
          {results.length === 0 ? (
            <div className="empty panel">No results for "{q}".</div>
          ) : (
            <div className="news-grid">
              {results.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </>
      )}
      {loading && <Loading />}
    </div>
  )
}