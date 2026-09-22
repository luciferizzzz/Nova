import { useI18n } from '../i18n'

const STACK = ['React', 'Vite', 'Node.js', 'Express', 'SQLite', 'rss-parser', 'node-cron', 'Argon2id']

export default function About() {
  const { t } = useI18n()

  return (
    <div className="page about-page">
      <div className="page-head">
        <h2>{t('about.title')}</h2>
      </div>

      <div className="settings-grid">
        <div className="panel about-main">
          <div className="about-brand">
            <div className="brand-name">NOVA</div>
            <div className="brand-sub">{t('about.tagline')}</div>
          </div>
          <div className="about-body">
            <p>{t('about.description')}</p>
            <p className="about-footer">{t('about.footer')}</p>
          </div>
        </div>

        <div className="settings-grid-col">
          <div className="panel">
            <div className="panel-title">{t('about.identity')}</div>
            <div className="about-rows">
              <div className="about-row">
                <span className="about-k">{t('about.version')}</span>
                <span className="about-v">0.1.0</span>
              </div>
              <div className="about-row">
                <span className="about-k">URL</span>
                <span className="about-v">{window.location.origin}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">{t('about.stack')}</div>
            <div className="about-chips">
              {STACK.map((s) => (
                <span className="chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">{t('about.principles')}</div>
            <ul className="about-list">
              <li>{t('about.principle1')}</li>
              <li>{t('about.principle2')}</li>
              <li>{t('about.principle3')}</li>
              <li>{t('about.principle4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}