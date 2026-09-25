import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addWatchlistItem, deleteWatchlistItem, getWatchlist } from '../services/api'
import { formatDate, number } from '../utils/format'
import { useI18n } from '../i18n'
import Loading from '../components/Loading'
import { PlusIcon, SearchIcon, TrashIcon } from '../components/icons'

const TYPES = ['topic', 'entity', 'keyword', 'source', 'category', 'country']

const EMPTY = { name: '', type: 'keyword', value: '' }

export default function Watchlist() {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(() => {
    getWatchlist()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name || !form.value) return setError(t('watch.needBoth'))
    setError('')
    try {
      await addWatchlistItem(form)
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('watch.remove'))) return
    try {
      await deleteWatchlistItem(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('watch.title')}</h2>
        <div className="head-actions">
          <span className="page-hint">{t('watch.count', { n: items.length })}</span>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon /> {t('watch.add')}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="panel">
          <div className="panel-title">{t('watch.formTitle')}</div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                {t('watch.name')}
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AI regulation"
                />
              </label>
              <label>
                {t('watch.type')}
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                {t('watch.value')}
                <input
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="e.g. artificial intelligence"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {t('watch.submit')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                {t('watch.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty panel">{t('watch.empty')}</div>
      ) : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('searches.thName')}</th>
                <th>{t('watch.type')}</th>
                <th>{t('watch.value')}</th>
                <th>{t('watch.thArticles')}</th>
                <th>{t('searches.thCreated')}</th>
                <th className="right">{t('searches.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div className="src-name">{w.name}</div>
                  </td>
                  <td>
                    <span className="status-chip ok">{w.type}</span>
                  </td>
                  <td>
                    <Link className="src-url" to={`/search?q=${encodeURIComponent(w.value)}`}>
                      {w.value}
                    </Link>
                  </td>
                  <td>{number(w.count)}</td>
                  <td>{formatDate(w.created_at)}</td>
                  <td className="right">
                    <Link className="icon-btn" title="Run" to={`/search?q=${encodeURIComponent(w.value)}`}>
                      <SearchIcon />
                    </Link>
                    <button className="icon-btn danger" title={t('searches.thActions')} onClick={() => remove(w.id)}>
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
        {t('watch.footer')}
      </div>
    </div>
  )
}