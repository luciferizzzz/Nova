import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getEvents, setEventLocation, clearEventLocation } from '../services/api'
import { categoryClass, number } from '../utils/format'
import { useI18n } from '../i18n'

// Legend sama dengan halaman Events (Milestone A) — sumber kebenaran tetap satu.
const EVENT_LEGEND = ['Conflict', 'Politics', 'Disaster', 'Economy', 'Technology', 'Other']

function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

function popupHtml(ev, labels) {
  const loc =
    ev.location_name ||
    `${Number(ev.latitude).toFixed(2)}, ${Number(ev.longitude).toFixed(2)}`
  return `
    <div class="map-popup">
      <span class="badge cat ${categoryClass(ev.category)}">${esc(ev.category || 'Other')}</span>
      <div class="map-popup-title">${esc(ev.title)}</div>
      <div class="map-popup-meta">${esc(loc)} · ${number(ev.article_count)} ${esc(labels.articles)}</div>
      <div class="map-popup-actions">
        <button type="button" class="btn-link" data-setloc data-id="${ev.id}">${esc(labels.setLocation)}</button>
      </div>
    </div>`
}

export default function MapView() {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState('')
  // { id, stable_id, title, lat, lng, name, hadCoords }
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const groupRef = useRef(null)
  const fittedRef = useRef(false)
  const editingRef = useRef(null)
  const eventsRef = useRef([])
  const startEditRef = useRef(null)

  editingRef.current = editing

  function load() {
    setLoading(true)
    getEvents({ limit: 200 })
      .then((d) => {
        setData(d)
        setNotice('')
      })
      .catch(() => setNotice(t('map.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Init Leaflet sekali per mount.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return undefined
    const map = L.map(mapEl.current, {
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      attributionControl: true
    }).setView([15, 100], 3)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    mapRef.current = map

    // Klik peta saat mode edit → isi koordinat form (Hybrid A+B: pick-on-map).
    map.on('click', (e) => {
      if (!editingRef.current) return
      setEditing((prev) =>
        prev ? { ...prev, lat: e.latlng.lat.toFixed(3), lng: e.latlng.lng.toFixed(3) } : prev
      )
    })

    // Tombol ATUR LOKASI di dalam popup (markup non-React → delegation).
    map.on('popupopen', (e) => {
      const btn = e.popup.getElement()?.querySelector('[data-setloc]')
      if (!btn) return
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'))
        const ev = eventsRef.current.find((x) => x.id === id)
        if (ev && startEditRef.current) {
          startEditRef.current(ev)
          e.popup.close()
        }
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      groupRef.current = null
      fittedRef.current = false
    }
  }, [])

  const categories = data?.categories || []
  const allEvents = data?.events || []
  const events = useMemo(
    () => (category ? allEvents.filter((e) => e.category === category) : allEvents),
    [allEvents, category]
  )
  const mapped = useMemo(
    () => events.filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'),
    [events]
  )
  const unmapped = useMemo(
    () => events.filter((e) => e.latitude == null || e.longitude == null),
    [events]
  )

  eventsRef.current = events

  // Sinkronkan marker dengan data (termasuk setelah save/clear manual).
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    const labels = { articles: t('events.articles'), setLocation: t('events.setLocation') }
    for (const ev of mapped) {
      const marker = L.circleMarker([ev.latitude, ev.longitude], {
        radius: 6,
        weight: 2,
        fillOpacity: 0.4,
        className: `map-pin ${categoryClass(ev.category)}`
      })
      marker.bindPopup(popupHtml(ev, labels), { maxWidth: 280 })
      group.addLayer(marker)
    }
    const map = mapRef.current
    if (map && !fittedRef.current && mapped.length) {
      try {
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 6 })
      } catch {
        /* bounds kosong — biarkan default view */
      }
      fittedRef.current = true
    }
  }, [mapped, t])

  function startEdit(ev) {
    setEditing({
      id: ev.id,
      stable_id: ev.stable_id,
      title: ev.title,
      lat: ev.latitude ?? '',
      lng: ev.longitude ?? '',
      name: ev.location_name || '',
      hadCoords: ev.latitude != null && ev.longitude != null
    })
  }
  startEditRef.current = startEdit

  function applyPatch(id, patch) {
    setData((prev) =>
      prev?.events
        ? { ...prev, events: prev.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }
        : prev
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const r = await setEventLocation(editing.id, {
        latitude: parseFloat(editing.lat),
        longitude: parseFloat(editing.lng),
        name: editing.name || undefined
      })
      applyPatch(editing.id, {
        latitude: r.latitude,
        longitude: r.longitude,
        location_name: r.locationName,
        location_source: r.locationSource
      })
      setNotice(t('events.locationSaved'))
      setEditing(null)
    } catch (err) {
      setNotice(err.message || t('events.locationError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!editing) return
    try {
      await clearEventLocation(editing.id)
      applyPatch(editing.id, {
        latitude: null,
        longitude: null,
        location_name: null,
        location_source: null
      })
      setEditing(null)
    } catch (err) {
      setNotice(err.message || t('events.locationError'))
    }
  }

  return (
    <div className="page map-page">
      <div className="page-head">
        <h2>{t('map.title')}</h2>
        <div className="page-head-actions">
          <span className="page-hint">
            {loading ? '…' : `${number(mapped.length)} / ${number(allEvents.length)} ${t('map.progress')}`}
          </span>
        </div>
      </div>

      <div className="panel filter-bar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('events.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>
        <button className="reset-btn" onClick={() => setCategory('')}>
          {t('events.reset')}
        </button>
      </div>

      <div className="panel event-legend">
        <span className="event-legend-title">{t('events.legend')}</span>
        {EVENT_LEGEND.map((type) => (
          <span key={type} className="event-legend-item">
            <span className={`event-dot ${categoryClass(type)}`} />
            {type}
          </span>
        ))}
      </div>

      {notice && <div className="error-banner">{notice}</div>}

      {data && allEvents.length === 0 && !loading ? (
        <div className="empty panel">{t('map.empty')}</div>
      ) : (
        <div className="map-layout">
          <div className="panel map-wrap">
            <div className="map-canvas" ref={mapEl} />
          </div>

          <aside className="panel map-side">
            {editing && (
              <div className="map-edit">
                <div className="map-side-head">
                  <span className="map-side-title">{t('events.setLocation')}</span>
                </div>
                <div className="map-edit-title" title={editing.title}>
                  {editing.title}
                </div>
                <div className="map-edit-hint">{t('map.pickHint')}</div>
                <form className="map-edit-form" onSubmit={handleSave}>
                  <input
                    className="finput"
                    type="number"
                    step="any"
                    placeholder={t('events.latitude')}
                    value={editing.lat}
                    onChange={(e) => setEditing({ ...editing, lat: e.target.value })}
                    required
                  />
                  <input
                    className="finput"
                    type="number"
                    step="any"
                    placeholder={t('events.longitude')}
                    value={editing.lng}
                    onChange={(e) => setEditing({ ...editing, lng: e.target.value })}
                    required
                  />
                  <input
                    className="finput map-edit-full"
                    type="text"
                    maxLength={100}
                    placeholder={t('events.locationName')}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                  <div className="map-edit-actions map-edit-full">
                    <button className="apply-btn" type="submit" disabled={saving}>
                      {saving ? '…' : t('events.saveLocation')}
                    </button>
                    {editing.hadCoords && (
                      <button className="reset-btn" type="button" onClick={handleClear}>
                        {t('events.clearLocation')}
                      </button>
                    )}
                    <button className="reset-btn" type="button" onClick={() => setEditing(null)}>
                      {t('events.cancelLocation')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="map-side-head">
              <span className="map-side-title">{t('map.unmappedTitle')}</span>
              <span className="map-side-count">{number(unmapped.length)}</span>
            </div>

            {loading ? (
              <div className="map-side-empty">{t('map.loading')}</div>
            ) : unmapped.length === 0 ? (
              <div className="map-side-empty">{t('map.allMapped')}</div>
            ) : (
              <div className="map-unmapped-list">
                {unmapped.map((ev) => (
                  <div key={ev.stable_id} className="map-unmapped-item">
                    <span className="map-unmapped-title" title={ev.title}>
                      {ev.title}
                    </span>
                    <button className="btn-link" onClick={() => startEdit(ev)}>
                      {t('events.setLocation')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
