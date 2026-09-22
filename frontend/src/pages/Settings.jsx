import { useEffect, useState } from 'react'
import { changePassword, getSettings, updateSettings } from '../services/api'
import { useI18n } from '../i18n'
import { COUNTRIES } from '../utils/format'

export default function Settings() {
  const { t, langs, setLanguage } = useI18n()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [gen, setGen] = useState({ language: 'en', country: 'Indonesia', theme: 'dark', interval: '30' })
  const [genMsg, setGenMsg] = useState({ type: '', text: '' })
  const [genBusy, setGenBusy] = useState(false)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setGen({
          language: s.language || 'en',
          country: s.country || 'Indonesia',
          theme: s.theme || 'dark',
          interval: s.rss_refresh_interval || '30'
        })
      })
      .catch(() => {})
  }, [])

  const set = (key) => (e) => setGen({ ...gen, [key]: e.target.value })

  const saveGeneral = async (e) => {
    e.preventDefault()
    setGenMsg({ type: '', text: '' })
    const min = parseInt(gen.interval, 10)
    if (!Number.isInteger(min) || min < 5 || min > 1440) {
      return setGenMsg({ type: 'err', text: t('settings.rssInvalid') })
    }
    setGenBusy(true)
    try {
      const saved = await updateSettings({
        language: gen.language,
        country: gen.country,
        theme: gen.theme,
        rss_refresh_interval: String(min)
      })
      setLanguage(gen.language)
      setGenMsg({ type: 'ok', text: `${t('settings.saved')} ${t('settings.rssSaved', { n: min })}` })
      return saved
    } catch (err) {
      setGenMsg({ type: 'err', text: err.message })
    } finally {
      setGenBusy(false)
    }
  }

  useEffect(() => {
    if (gen.theme) {
      document.documentElement.setAttribute('data-theme', gen.theme)
      localStorage.setItem('nova-theme', gen.theme)
    }
  }, [gen.theme])

  const submitPw = async (e) => {
    e.preventDefault()
    setPwMsg({ type: '', text: '' })
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'err', text: t('settings.pwMismatch') })
    if (pw.next.length < 6) return setPwMsg({ type: 'err', text: t('settings.pwTooShort') })
    setPwBusy(true)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ type: 'ok', text: t('settings.pwUpdated') })
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message })
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="page settings-page">
      <div className="page-head">
        <h2>{t('settings.title')}</h2>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-title">{t('settings.general')}</div>
          <form onSubmit={saveGeneral} className="settings-form">
            <label>
              {t('settings.language')}
              <select value={gen.language} onChange={set('language')}>
                {langs.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('settings.country')}
              <select value={gen.country} onChange={set('country')}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('settings.theme')}
              <select value={gen.theme} onChange={set('theme')}>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="light">{t('settings.themeLight')}</option>
              </select>
            </label>
            <label>
              {t('settings.rssInterval')}
              <input type="number" min="5" max="1440" value={gen.interval} onChange={set('interval')} />
            </label>
            {genMsg.text && <div className={`form-msg ${genMsg.type}`}>{genMsg.text}</div>}
            <button type="submit" className="btn-primary" disabled={genBusy}>
              {genBusy ? '…' : t('settings.saveSettings')}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title">{t('settings.security')}</div>
          <form onSubmit={submitPw} className="settings-form">
            <label>
              {t('settings.currentPassword')}
              <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </label>
            <label>
              {t('settings.newPassword')}
              <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </label>
            <label>
              {t('settings.confirmPassword')}
              <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </label>
            {pwMsg.text && <div className={`form-msg ${pwMsg.type}`}>{pwMsg.text}</div>}
            <button type="submit" className="btn-primary" disabled={pwBusy}>
              {pwBusy ? '…' : t('settings.updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}