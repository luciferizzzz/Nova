import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteSavedSearch, getSavedSearches, saveSearch } from '../services/api'
import { formatDate } from '../utils/format'
import { useI18n } from '../i18n'
import Loading from '../components/Loading'
import { PlusIcon, SearchIcon, TrashIcon } from '../components/icons'

export default function SavedSearches() {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', query: '' })

  const load = useCallback(() => {
    getSavedSearches()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name || !form.query) return setError(t('searches.needBoth'))
    setError('')
    try {
      await saveSearch(form.name, form.query)
      setForm({ name: '', query: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('searches.delete'))) return
    try {
      await deleteSavedSearch(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('searches.title')}</h2>
        <div className="head-actions">
          <span className="page-hint">{t('searches.count', { n: items.length })}</span>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon /> {t('searches.save')}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="panel">
          <div className="panel-title">{t('searches.formTitle')}</div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                {t('searches.name')}
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AI news"
                />
              </label>
              <label className="wide">
                {t('searches.query')}
                <input
                  value={form.query}
                  onChange={(e) => setForm({ ...form, query: e.target.value })}
                  placeholder="e.g. artificial intelligence"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {t('searches.submit')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                {t('searches.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty panel">{t('searches.empty')}</div>
      ) : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('searches.thName')}</th>
                <th>{t('searches.thQuery')}</th>
                <th>{t('searches.thCreated')}</th>
                <th className="right">{t('searches.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="src-name">{s.name}</div>
                  </td>
                  <td>
                    <Link className="src-url" to={`/search?q=${encodeURIComponent(s.query)}`}>
                      {s.query}
                    </Link>
                  </td>
                  <td>{formatDate(s.created_at)}</td>
                  <td className="right">
                    <Link className="icon-btn" title="Run" to={`/search?q=${encodeURIComponent(s.query)}`}>
                      <SearchIcon />
                    </Link>
                    <button className="icon-btn danger" title={t('searches.thActions')} onClick={() => remove(s.id)}>
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="page-hint" style={{ marginTop: 12 }}>
        {t('searches.footer')}
      </div>
    </div>
  )
}