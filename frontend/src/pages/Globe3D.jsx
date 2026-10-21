import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Globe from 'globe.gl'
import { GlobeIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { getEvents, enrichEvents } from '../services/api'

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

const CAT_COLORS = {
  World: '#7aa2f7',
  Technology: '#9ece6a',
  Business: '#e0af68',
  Science: '#bb9af7',
  Local: '#f7768e',
  Indonesia: '#f7768e',
  Politics: '#f7768e',
  Economy: '#e0af68',
  Disaster: '#ff9e64',
  Conflict: '#ff6b6b'
}

export default function Globe3D() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const [allEvents, setAllEvents] = useState([])
  const [events, setEvents] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [error, setError] = useState('')
  const [activeCats, setActiveCats] = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [locForm, setLocForm] = useState({ lat: '', lng: '', name: '' })

  const load = () => {
    getEvents({ limit: 200 })
      .then((res) => {
        const list = res?.events || []
        setAllEvents(list)
        const mapped = list.filter((e) => e.latitude != null && e.longitude != null)
        const unmap = list.filter((e) => e.latitude == null || e.longitude == null)
        setEvents(mapped)
        setUnmapped(unmap)
        if (activeCats.size === 0) {
          const cats = new Set(mapped.map((e) => e.category).filter(Boolean))
          setActiveCats(cats)
        }
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return
    const globe = Globe()(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#3a7bd5')
      .atmosphereAltitude(0.25)
      .pointAltitude(0.01)
      .pointRadius(0.4)
      .pointsData([])
      .onPointClick((p) => {
        const ev = allEvents.find((e) => e.id === p.id)
        if (!ev) return
        setSelected(ev)
        setLocForm({ lat: ev.latitude || '', lng: ev.longitude || '', name: ev.location_name || '' })
        try { globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.8 }, 1000) } catch {}
      })
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
    globeRef.current = globe
    const resize = () => {
      if (containerRef.current && globeRef.current) {
        globeRef.current.width(containerRef.current.clientWidth)
        globeRef.current.height(containerRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [allEvents])

  useEffect(() => {
    if (!globeRef.current) return
    const filtered = events.filter((e) => activeCats.has(e.category))
    const data = filtered.map((e) => ({
      lat: Number(e.latitude),
      lng: Number(e.longitude),
      label: e.location_name || e.title,
      category: e.category,
      id: e.id
    }))
    globeRef.current
      .pointsData(data)
      .pointColor((d) => CAT_COLORS[d.category] || '#9b9b9b')
      .pointLabel((d) => `<div style="background:rgba(0,0,0,0.85);padding:4px 6px;border-radius:4px;font-size:12px;max-width:260px;">${d.label}</div>`)
  }, [events, activeCats])

  const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean))).sort()
  const toggleCat = (c) => {
    const next = new Set(activeCats)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setActiveCats(next)
  }

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
          <h1 className="page-title">
            <GlobeIcon size={18} /> {t('globe3d.title')}
          </h1>
          <p className="page-sub">{t('globe3d.sub')}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={doEnrich}>{t('globe3d.enrich')}</button>
          <Link className="btn" to="/map">{t('globe3d.openMap')}</Link>
          <Link className="btn" to="/events">{t('globe3d.openEvents')}</Link>
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
                  <span className="globe3d-dot" style={{ background: CAT_COLORS[c] || '#9b9b9b' }} />
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
                <button className="btn" onClick={() => setSelected(null)}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={() => doSetLocation(selected)}>{t('common.save')}</button>
                <button className="btn" onClick={() => navigate(`/events`)}>{t('globe3d.openInEvents')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
