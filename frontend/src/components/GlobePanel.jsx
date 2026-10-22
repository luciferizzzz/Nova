import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { categoryClass } from '../utils/format'
import { useGlobe } from '../hooks/useGlobe'

/**
 * Panel globe di dashboard.
 *
 * Sebelumnya kotak ini cuma placeholder (ikon + teks) yang menuju ke /globe.
 * Sekarang globe 3D-nya benar-benar di-render di dalam kotak, memakai hook
 * yang sama dengan halaman /globe — sehingga marker, warna kategori, dan
 * lifecycle WebGL-nya konsisten.
 *
 * Versi ringkas: tanpa sidebar/legend/modal. Klik marker atau tombol
 * "Open full globe" membawa user ke halaman penuh /globe.
 */
export default function GlobePanel() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const { containerRef, allEvents, events, categories, error } = useGlobe({
    autoRotate: true,
    autoRotateSpeed: 0.35,
    // pointRadius dalam satuan derajat busur. Di globe mini (canvas ±318 px,
    // altitude 2.0) radius 0.35° cuma ~0.7 px -> praktis tak terlihat.
    // 1.1° memberi marker ~4–5 px supaya kelihatan dan mudah di-hover.
    pointRadius: 1.1,
    fitOnLoad: true,
    fitAltitude: 2.0,
    onPointClick: () => navigate('/globe')
  })

  return (
    <div className="panel globe-panel">
      <div ref={containerRef} className="globe-mini-canvas" />

      <div className="globe-mini-overlay">
        <div className="globe-mini-row globe-mini-top">
          <span className="globe-mini-title">{t('globe.title')}</span>
          <button type="button" className="btn-link globe-mini-open" onClick={() => navigate('/globe')}>
            {t('globe.open')}
          </button>
        </div>

        <div className="globe-mini-row globe-mini-bottom">
          <div className="globe-mini-legend">
            {categories.map((c) => (
              <span key={c} className="globe-mini-legend-item">
                <span className={`globe3d-dot ${categoryClass(c)}`} />
                <span className="globe-mini-legend-label">{c}</span>
              </span>
            ))}
          </div>
          <span className="globe-mini-count">
            {t('globe3d.mappedCount', { n: events.length, total: allEvents.length })}
          </span>
        </div>

        {error && <div className="globe-mini-error">{error}</div>}
      </div>
    </div>
  )
}
