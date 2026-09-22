import { useCallback, useEffect, useState } from 'react'
import { addSource, deleteSource, getSources, refreshSources, updateSource } from '../services/api'
import { formatDate, number, COUNTRIES, CATEGORIES, LANGUAGES } from '../utils/format'
import Loading from '../components/Loading'
import { PlusIcon, RefreshIcon, TrashIcon } from '../components/icons'

const EMPTY = { name: '', rss_url: '', country: 'Indonesia', language: 'id', category: 'World' }

export default function Sources() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshMsg, setRefreshMsg] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(() => {
    getSources()
      .then(setSources)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const startAdd = () => {
    setForm(EMPTY)
    setEditing({ mode: 'add' })
  }
  const startEdit = (s) => {
    setForm({ name: s.name, rss_url: s.rss_url, country: s.country, language: s.language, category: s.category })
    setEditing({ mode: 'edit', id: s.id })
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name || !form.rss_url) return setError('Name and RSS URL are required')
    setError('')
    try {
      if (editing.mode === 'add') await addSource(form)
      else await updateSource(editing.id, form)
      setEditing(null)
      setForm(EMPTY)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleEnabled = async (s) => {
    try {
      await updateSource(s.id, { enabled: !s.enabled })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (s) => {
    if (!window.confirm(`Delete source "${s.name}"?`)) return
    try {
      await deleteSource(s.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const refreshAll = async () => {
    setRefreshMsg('Fetching…')
    setError('')
    try {
      const res = await refreshSources()
      setRefreshMsg(`Done: ${res.total} new articles from ${res.ok} sources (${res.failed} failed)`)
      load()
    } catch (err) {
      setRefreshMsg('')
      setError(err.message)
    }
  }

  if (loading) return <Loading />
  if (error && sources.length === 0) {
    return <div className="empty panel">{error}</div>
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>SOURCES</h2>
        <div className="head-actions">
          {refreshMsg && <span className="page-hint">{refreshMsg}</span>}
          <button className="btn-secondary" onClick={refreshAll} disabled={!!refreshMsg}>
            <RefreshIcon /> REFRESH NOW
          </button>
          <button className="btn-primary" onClick={startAdd}>
            <PlusIcon /> ADD SOURCE
          </button>
        </div>
      </div>

      {error && sources.length > 0 && <div className="error-banner">{error}</div>}

      {editing && (
        <div className="panel source-form">
          <div className="panel-title">{editing.mode === 'add' ? 'ADD RSS SOURCE' : 'EDIT SOURCE'}</div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                Name *
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="wide">
                RSS URL *
                <input value={form.rss_url} onChange={(e) => setForm({ ...form, rss_url: e.target.value })} placeholder="https://..." />
              </label>
              <label>
                Country
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editing.mode === 'add' ? 'ADD SOURCE' : 'SAVE CHANGES'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last Fetch</th>
              <th>Articles</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className={s.enabled ? '' : 'row-disabled'}>
                <td>
                  <div className="src-name">{s.name}</div>
                  <div className="src-url">{s.rss_url}</div>
                </td>
                <td>{s.country}</td>
                <td>{s.category}</td>
                <td>
                  <button className={`status-chip ${s.status === 'active' ? 'ok' : 'err'}`} onClick={() => toggleEnabled(s)} title="Toggle enabled">
                    {s.enabled ? s.status : 'disabled'}
                  </button>
                </td>
                <td>{s.last_fetch ? formatDate(s.last_fetch) : '—'}</td>
                <td>{number(s.article_count)}</td>
                <td className="right">
                  <button className="icon-btn" title="Edit" onClick={() => startEdit(s)}>
                    ⋯
                  </button>
                  <button className="icon-btn danger" title="Delete" onClick={() => remove(s)}>
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}