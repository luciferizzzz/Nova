import { useState } from 'react'
import { downloadExport } from '../services/api'
import { useI18n } from '../i18n'

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Export() {
  const { t } = useI18n()
  const [scope, setScope] = useState('full')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)

  const run = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    setBusy(true)
    const format = scope === 'news-csv' ? 'csv' : 'json'
    try {
      const blob = await downloadExport(format)
      const stamp = new Date().toISOString().slice(0, 10)
      const filename =
        format === 'csv' ? `nova-news-${stamp}.csv` : `nova-export-${stamp}.json`
      saveBlob(blob, filename)
      setMsg({ type: 'ok', text: t('export.done') })
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('export.title')}</h2>
      </div>

      <div className="panel">
        <form className="settings-form" onSubmit={run}>
          <label className="wide">
            {t('export.scope')}
            <div className="export-options">
              <label className="radio-opt">
                <input
                  type="radio"
                  name="scope"
                  value="full"
                  checked={scope === 'full'}
                  onChange={(e) => setScope(e.target.value)}
                />
                <span>{t('export.scopeFull')}</span>
              </label>
              <label className="radio-opt">
                <input
                  type="radio"
                  name="scope"
                  value="news-csv"
                  checked={scope === 'news-csv'}
                  onChange={(e) => setScope(e.target.value)}
                />
                <span>{t('export.newsCsv')}</span>
              </label>
            </div>
          </label>
          {msg.text && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t('export.fetching') : t('export.download')}
          </button>
        </form>
      </div>
    </div>
  )
}