import { Link } from 'react-router-dom'
import { GlobeIcon } from './icons'
import { useI18n } from '../i18n'

export default function GlobePanel() {
  const { t } = useI18n()
  return (
    <Link to="/globe" className="panel globe-panel globe-panel-link" aria-label={t('globe.open')}>
      <div className="globe-placeholder">
        <GlobeIcon size={54} />
        <div className="globe-title">{t('globe.title')}</div>
        <div className="globe-sub">{t('globe.sub')} — {t('globe.open')}</div>
      </div>
    </Link>
  )
}