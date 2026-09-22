import { GlobeIcon } from './icons'
import { useI18n } from '../i18n'

export default function GlobePanel() {
  const { t } = useI18n()
  return (
    <div className="panel globe-panel">
      <div className="globe-placeholder">
        <GlobeIcon size={54} />
        <div className="globe-title">{t('globe.title')}</div>
        <div className="globe-sub">{t('globe.sub')}</div>
      </div>
    </div>
  )
}