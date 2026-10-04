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
  const [ai, setAi] = useState({
    ai_enabled: 'false',
    ai_provider: 'extractive',
    ai_endpoint: 'http://localhost:11434',
    ai_model: 'llama3.2:3b',
    ai_max_tokens: '256',
    ai_temperature: '0.2'
  })
  const [genMsg, setGenMsg] = useState({ type: '', text: '' })
  const [aiMsg, setAiMsg] = useState({ type: '', text: '' })
  const [genBusy, setGenBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setGen({
          language: s.language || 'en',
          country: s.country || 'Indonesia',
          theme: s.theme || 'dark',
          interval: s.rss_refresh_interval || '30'
        })
        setAi({
          ai_enabled: s.ai_enabled || 'false',
          ai_provider: s.ai_provider || 'extractive',
          ai_endpoint: s.ai_endpoint || 'http://localhost:11434',
          ai_model: s.ai_model || 'llama3.2:3b',
          ai_max_tokens: s.ai_max_tokens || '256',
          ai_temperature: s.ai_temperature || '0.2'
        })
      })
      .catch(() => {})
  }, [])

  const set = (key) => (e) => setGen({ ...gen, [key]: e.target.value })
  const setAiField = (key) => (e) => setAi({ ...ai, [key]: e.target.value })

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

  const saveAi = async (e) => {
    e.preventDefault()
    setAiMsg({ type: '', text: '' })
    setAiBusy(true)
    try {
      await updateSettings({
        ai_enabled: ai.ai_enabled === 'true' ? 'true' : 'false',
        ai_provider: ai.ai_provider,
        ai_endpoint: ai.ai_endpoint,
        ai_model: ai.ai_model,
        ai_max_tokens: ai.ai_max_tokens,
        ai_temperature: ai.ai_temperature
      })
      setAiMsg({ type: 'ok', text: t('ai.saved') })
    } catch (err) {
      setAiMsg({ type: 'err', text: err.message })
    } finally {
      setAiBusy(false)
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
              {pwBusy ? '�?�' : t('settings.updatePassword')}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title">{t('ai.title')}</div>
          <form onSubmit={saveAi} className="settings-form">
            <label>
              {t('ai.enabled')}
              <select value={ai.ai_enabled} onChange={setAiField('ai_enabled')}>
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </label>
            <label>
              {t('ai.provider')}
              <select value={ai.ai_provider} onChange={setAiField('ai_provider')}>
                <option value="extractive">Extractive</option>
                <option value="ollama">Ollama</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label>
              {t('ai.endpoint')}
              <input type="text" value={ai.ai_endpoint} onChange={setAiField('ai_endpoint')} placeholder="http://localhost:11434" />
            </label>
            <label>
              {t('ai.model')}
              <input type="text" value={ai.ai_model} onChange={setAiField('ai_model')} placeholder="llama3.2:3b" />
            </label>
            <label>
              {t('ai.maxTokens')}
              <input type="number" min="50" max="2048" value={ai.ai_max_tokens} onChange={setAiField('ai_max_tokens')} />
            </label>
            <label>
              {t('ai.temperature')}
              <input type="number" min="0" max="1" step="0.1" value={ai.ai_temperature} onChange={setAiField('ai_temperature')} />
            </label>
            <small className="help-text">{t('ai.help')}</small>
            {aiMsg.text && <div className={`form-msg ${aiMsg.type}`}>{aiMsg.text}</div>}
            <button type="submit" className="btn-primary" disabled={aiBusy}>
              {aiBusy ? '�?�' : t('ai.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}