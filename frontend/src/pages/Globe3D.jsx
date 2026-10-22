import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GlobeIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { enrichEvents } from '../services/api'
import { categoryClass } from '../utils/format'
import { useGlobe } from '../hooks/useGlobe'

async function setEventLocation(id, { latitude, longitude, name }) {
  return fetch(`/api/events/${id}/location`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, name })
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export default function Globe3D() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [locForm, setLocForm] = useState({ lat: '', lng: '', name: '' })

  // Semua logika globe.gl (init, warna token --cat-*, cleanup StrictMode)
  // dipindah ke hook bersama — panel mini di dashboard memakai hook yang sama.
  const {
    containerRef,
    globeRef,
    events,
    unmapped,
    categories,
    activeCats,
    toggleCat,
    load,
    error,
    setError
  } = useGlobe({
    flyToOnClick: true,
    onPointClick: (ev) => {
      setSelected(ev)
      setLocForm({ lat: ev.latitude || '', lng: ev.longitude || '', name: ev.location_name || '' })
    }
  })

  const doSetLocation = async (ev) => {
    try {
      await setEventLocation(ev.id, { latitude: Number(locForm.lat), longitude: Number(locForm.lng), name: locForm.name || undefined })
      setSelected(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const doEnrich = async () => {
    try {
      await enrichEvents()
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page globe3d-page">
      <div className="page-head">
        <div>
          <h2><GlobeIcon size={18} /> {t('globe3d.title')}</h2>
          <span className="page-hint">{t('globe3d.sub')}</span>
        </div>
        <div className="page-head-actions">
          <button type="button" className="reset-btn" onClick={() => {
            if (!globeRef.current) return
            try { globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 800) } catch {}
          }}>{t('globe3d.resetView')}</button>
          <button type="button" className="reset-btn" onClick={() => {
            if (!globeRef.current || events.length === 0) return
            try {
              const lats = events.map(e => Number(e.latitude))
              const lngs = events.map(e => Number(e.longitude))
              const lat = lats.reduce((a,b)=>a+b,0)/lats.length
              const lng = lngs.reduce((a,b)=>a+b,0)/lngs.length
              globeRef.current.pointOfView({ lat, lng, altitude: 1.6 }, 1000)
            } catch {}
          }}>{t('globe3d.fitToMapped')}</button>
          <button type="button" className="apply-btn" onClick={doEnrich}>{t('globe3d.enrich')}</button>
          <Link className="btn-link" to="/map">{t('globe3d.openMap')}</Link>
          <Link className="btn-link" to="/events">{t('globe3d.openEvents')}</Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="globe3d-layout">
        <aside className="globe3d-sidebar">
          <div className="panel globe3d-panel-block">
            <div className="globe3d-block-title">{t('globe3d.legend')}</div>
            <div className="globe3d-legend">
              {categories.map((c) => (
                <button key={c} className={`globe3d-legend-item ${activeCats.has(c) ? 'active' : ''}`} onClick={() => toggleCat(c)}>
                  <span className={`globe3d-dot ${categoryClass(c)}`} />
                  <span>{c}</span>
                  <span className="globe3d-count">{events.filter((e) => e.category === c).length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel globe3d-panel-block">
            <div className="globe3d-block-title">{t('globe3d.unmapped')} ({unmapped.length})</div>
            <div className="globe3d-unmapped">
              {unmapped.slice(0, 30).map((e) => (
                <button key={e.id} className="globe3d-unmapped-item" onClick={() => { setSelected(e); setLocForm({ lat: '', lng: '', name: e.title.slice(0, 60) }) }}>
                  <div className="globe3d-unmapped-title">{e.title}</div>
                  <div className="globe3d-unmapped-sub">{e.category}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="panel globe3d-panel globe3d-canvas-wrap">
          <div ref={containerRef} className="globe3d-canvas" />
          <div className="globe3d-overlay">
            <span>{t('globe3d.mappedCount', { n: events.filter((e) => activeCats.has(e.category)).length, total: events.length })}</span>
          </div>
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{t('globe3d.setLocation')}</div>
              <button className="icon-btn" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="globe3d-selected-title">{selected.title}</div>
              <div className="form-row">
                <label>Latitude</label>
                <input value={locForm.lat} onChange={(e) => setLocForm({ ...locForm, lat: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Longitude</label>
                <input value={locForm.lng} onChange={(e) => setLocForm({ ...locForm, lng: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Location name</label>
                <input value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>{t('common.cancel')}</button>
                <button type="button" className="btn-primary" onClick={() => doSetLocation(selected)}>{t('common.save')}</button>
                <button type="button" className="btn-secondary" onClick={() => navigate(`/events`)}>{t('globe3d.openInEvents')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
