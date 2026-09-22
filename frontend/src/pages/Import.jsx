import { useRef, useState } from 'react'
import { importData } from '../services/api'
import { useI18n } from '../i18n'

export default function Import() {
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onPick = (e) => {
    const file = e.target.files?.[0]
    setFileName(file ? file.name : '')
    setResult('')
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setResult('')
    setError('')
    setBusy(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await importData(payload)
      setResult(t('import.result', { n: res.berita, s: res.sources, b: res.bookmarks, g: res.settings }))
    } catch (err) {
      setError(t('import.badFile', { m: err.message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t('import.title')}</h2>
      </div>

      <div className="panel">
        <form className="settings-form" onSubmit={submit}>
          <label className="wide">
            {t('import.select')}
            <input type="file" ref={fileRef} accept=".json,application/json" onChange={onPick} />
          </label>
          {fileName && <div className="form-msg ok">{fileName}</div>}
          {result && <div className="form-msg ok">{result}</div>}
          {error && <div className="form-msg err">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy || !fileName}>
            {busy ? '…' : t('import.upload')}
          </button>
        </form>
      </div>
    </div>
  )
}