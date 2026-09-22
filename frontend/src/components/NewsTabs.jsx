import { useI18n } from '../i18n'

const TAB_IDS = ['latest', 'trending', 'local', 'world', 'technology', 'business', 'science']

export default function NewsTabs({ active, onChange }) {
  const { t } = useI18n()
  return (
    <div className="news-tabs">
      {TAB_IDS.map((id) => (
        <button
          key={id}
          className={`tab${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          {t(`tabs.${id}`)}
        </button>
      ))}
    </div>
  )
}