import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { getEvents } from '../services/api'
import { categoryClass } from '../utils/format'

/**
 * Hook bersama untuk globe.gl — dipakai halaman /globe (Globe3D.jsx) dan
 * panel mini di dashboard (GlobePanel.jsx).
 *
 * Tiga hal yang wajib dijaga di sini (regresi pernah terjadi persis di titik
 * ini, lihat catatan audit Milestone C):
 *
 * 1. Callback globe.gl (onPointClick) dibuat SEKALI saat init globe. Kalau ia
 *    membaca state langsung, ia menangkap nilai render pertama ([]) sehingga
 *    klik marker tidak pernah menemukan event -> data harus dibaca via ref.
 * 2. Warna kategori bukan hex hardcode, tapi token CSS --cat-* yang dibaca via
 *    getComputedStyle. globe.gl melukis ke canvas WebGL, jadi nilainya harus
 *    datang dari CSS supaya ikut berubah saat tema/accent diganti.
 * 3. Cleanup WAJIB memanggil globe._destructor() lalu mengosongkan ref.
 *    React.StrictMode (mode dev) menjalankan efek dua kali: tanpa itu, run
 *    kedua melihat ref sudah terisi lalu keluar lebih awal dan listener
 *    resize tidak pernah dipasang ulang.
 */
export function useGlobe({
  onPointClick,
  flyToOnClick = false,
  autoRotate = false,
  autoRotateSpeed = 0.4,
  pointRadius = 0.4,
  fitOnLoad = false,
  fitAltitude = 2.0,
} = {}) {
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const eventsRef = useRef([])
  const didFitRef = useRef(false)
  const optsRef = useRef({ onPointClick, flyToOnClick, autoRotate, autoRotateSpeed, pointRadius, fitOnLoad, fitAltitude })
  const [allEvents, setAllEvents] = useState([])
  const [events, setEvents] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [error, setError] = useState('')
  const [activeCats, setActiveCats] = useState(new Set())
  const [themeTick, setThemeTick] = useState(0)

  // Opsi disimpan di ref supaya efek init globe tetap deps [] (sekali saja).
  // Deklarasi efek ini DI ATAS efek init supaya saat mount, optsRef sudah
  // terisi sebelum globe dibuat.
  useEffect(() => {
    optsRef.current = { onPointClick, flyToOnClick, autoRotate, autoRotateSpeed, pointRadius, fitOnLoad, fitAltitude }
  })

  // Token --cat-* berbeda antara dark & light, dan aplikasi tidak punya
  // event perubahan tema -> MutationObserver pada atribut root.
  useEffect(() => {
    const root = document.documentElement
    const obs = new MutationObserver(() => setThemeTick((k) => k + 1))
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] })
    return () => obs.disconnect()
  }, [])

  const catColors = useMemo(() => {
    const cs = getComputedStyle(document.documentElement)
    const out = {}
    for (const c of new Set(allEvents.map((e) => e.category).filter(Boolean))) {
      out[c] = cs.getPropertyValue(`--${categoryClass(c)}`).trim() || '#9b9b9b'
    }
    return out
  }, [allEvents, themeTick])

  const load = () =>
    getEvents({ limit: 200 })
      .then((res) => {
        const list = res?.events || []
        eventsRef.current = list
        setAllEvents(list)
        const mapped = list.filter((e) => e.latitude != null && e.longitude != null)
        setEvents(mapped)
        setUnmapped(list.filter((e) => e.latitude == null || e.longitude == null))
        // Filter kategori default = semua kategori yang punya koordinat.
        setActiveCats((prev) => (prev.size === 0 ? new Set(mapped.map((e) => e.category).filter(Boolean)) : prev))
        // Kamera default globe.gl menghadap lat 0 / lng 0 (Teluk Guinea).
        // Untuk globe mini di dashboard, arahkan sekali ke centroid event
        // supaya marker langsung terlihat, bukan di belahan belakang.
        if (optsRef.current.fitOnLoad && !didFitRef.current && mapped.length > 0) {
          const lat = mapped.reduce((s, e) => s + Number(e.latitude), 0) / mapped.length
          const lng = mapped.reduce((s, e) => s + Number(e.longitude), 0) / mapped.length
          try {
            globeRef.current?.pointOfView({ lat, lng, altitude: optsRef.current.fitAltitude }, 0)
            didFitRef.current = true
          } catch {}
        }
        return list
      })
      .catch((err) => {
        setError(err.message)
        return []
      })

  useEffect(() => {
    load()
  }, [])

  // Init globe — efek sekali saja. Callback-nya membaca data lewat ref.
  useEffect(() => {
    if (!containerRef.current || globeRef.current) return undefined
    const el = containerRef.current
    const opts = optsRef.current
    const globe = Globe()(el)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#3a7bd5')
      .atmosphereAltitude(0.25)
      .pointAltitude(0.01)
      .pointRadius(opts.pointRadius)
      .pointsData([])
      .onPointClick((p) => {
        const ev = eventsRef.current.find((e) => e.id === p.id)
        if (!ev) return
        if (opts.flyToOnClick) {
          try { globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.8 }, 1000) } catch {}
        }
        opts.onPointClick?.(ev, p)
      })
      .width(el.clientWidth)
      .height(el.clientHeight)

    if (opts.autoRotate) {
      const controls = globe.controls()
      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = opts.autoRotateSpeed
      }
    }

    globeRef.current = globe

    const resize = () => {
      if (containerRef.current && globeRef.current) {
        globeRef.current.width(containerRef.current.clientWidth)
        globeRef.current.height(containerRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      // Lepaskan WebGL + listener internal globe.gl dan kosongkan ref.
      // Tanpa ini React.StrictMode (mode dev) menjalankan efek dua kali: run
      // kedua melihat globeRef terisi lalu keluar lebih awal, sehingga
      // listener resize tidak pernah dipasang ulang.
      if (globeRef.current) {
        if (typeof globeRef.current._destructor === 'function') globeRef.current._destructor()
        globeRef.current = null
      }
    }
  }, [])

  // Jeda animasi saat tab disembunyikan — globe di dashboard berputar terus
  // dan tidak perlu merender saat tidak ada yang melihat.
  useEffect(() => {
    if (!optsRef.current.autoRotate) return undefined
    const onVisibility = () => {
      const globe = globeRef.current
      if (!globe) return
      try {
        if (document.hidden) globe.pauseAnimation?.()
        else globe.resumeAnimation?.()
      } catch {}
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

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
      .pointColor((d) => catColors[d.category] || '#9b9b9b')
      .pointLabel((d) => `<div style="background:rgba(0,0,0,0.85);padding:4px 6px;border-radius:4px;font-size:12px;max-width:260px;">${d.label}</div>`)
  }, [events, activeCats, catColors])

  const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean))).sort()

  const toggleCat = (c) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  return {
    containerRef,
    globeRef,
    allEvents,
    events,
    unmapped,
    categories,
    activeCats,
    toggleCat,
    catColors,
    error,
    setError,
    load
  }
}
