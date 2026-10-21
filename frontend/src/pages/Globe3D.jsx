import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Globe from 'globe.gl'
import { GlobeIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { getEvents } from '../services/api'

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
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getEvents({ limit: 200 })
      .then((res) => {
        setEvents((res?.events || []).filter((e) => e.latitude != null && e.longitude != null))
      })
      .catch((err) => setError(err.message))
  }, [])

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
      .pointColor((d) => CAT_COLORS[d.category] || '#9b9b9b')
      .pointsData([])
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
    globeRef.current = globe
    const resize = () => {
      if (containerRef.current) {
        globe.width(containerRef.current.clientWidth)
        globe.height(containerRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!globeRef.current) return
    const data = events.map((e) => ({
      lat: Number(e.latitude),
      lng: Number(e.longitude),
      label: e.location_name || e.title,
      category: e.category,
      id: e.id
    }))
    globeRef.current
      .pointsData(data)
      .pointLabel((d) => `<div style="background:rgba(0,0,0,0.8);padding:4px 6px;border-radius:4px;font-size:12px;">${d.label}</div>`)
  }, [events])

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
          <Link className="btn" to="/map">{t('globe3d.openMap')}</Link>
          <Link className="btn" to="/events">{t('globe3d.openEvents')}</Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel globe3d-panel globe3d-canvas-wrap">
        <div ref={containerRef} className="globe3d-canvas" />
        <div className="globe3d-overlay">
          <span>{t('globe3d.mappedCount', { n: events.length, total: 200 })}</span>
        </div>
      </div>
    </div>
  )
}
