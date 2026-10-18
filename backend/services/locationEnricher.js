// Location Enricher — Phase 9 Sesi 1 (Geo Mapping, Milestone A).
//
// Mengisi kolom events.latitude/longitude (sejak awal schema selalu NULL) dari
// sumber **offline**: gazetteer statis negara + kota. Tanpa geocoding online —
// prinsip local-first NOVA (keputusan meeting 2026-10-17: Hybrid A+B — gazetteer
// offline dulu, input manual sebagai fallback).
//
// Kontrak:
//   - enrichEvents(db)   — isi koordinat event yang masih NULL via teks judul + deskripsi
//   - setEventLocation() — fallback manual per event (location_source='manual')
//   - clearEventLocation() — hapus manual → kembali kandidat auto di scan berikutnya
//
// Jaminan lintas scan: persistEvents() (eventEngine) tidak pernah menyentuh
// latitude/longitude/location_* — UPDATE event hanya stable_id/title/description/
// category/updated_at, jadi koordinat (manual maupun gazetteer) bertahan.

const GAZETTEER = [
    // ── Negara (sentroid) — mencakup semua negara sumber RSS + tetangga ──
    { name: 'Indonesia', kind: 'country', latitude: -2.5, longitude: 118.0, aliases: ['indonesia'] },
    { name: 'Malaysia', kind: 'country', latitude: 4.2, longitude: 101.9, aliases: ['malaysia'] },
    { name: 'Singapore', kind: 'country', latitude: 1.35, longitude: 103.82, aliases: ['singapore', 'singapura'] },
    { name: 'Thailand', kind: 'country', latitude: 15.0, longitude: 101.0, aliases: ['thailand'] },
    { name: 'Philippines', kind: 'country', latitude: 12.8, longitude: 121.7, aliases: ['philippines', 'filipina'] },
    { name: 'Vietnam', kind: 'country', latitude: 14.0, longitude: 108.0, aliases: ['vietnam'] },
    { name: 'Japan', kind: 'country', latitude: 36.2, longitude: 138.2, aliases: ['japan', 'jepang'] },
    { name: 'South Korea', kind: 'country', latitude: 36.5, longitude: 127.9, aliases: ['south korea', 'korea selatan'] },
    { name: 'North Korea', kind: 'country', latitude: 40.0, longitude: 127.0, aliases: ['north korea', 'korea utara'] },
    { name: 'China', kind: 'country', latitude: 35.8, longitude: 104.1, aliases: ['china', 'tiongkok'] },
    { name: 'India', kind: 'country', latitude: 20.5, longitude: 78.9, aliases: ['india'] },
    { name: 'Australia', kind: 'country', latitude: -25.2, longitude: 133.7, aliases: ['australia'] },
    { name: 'New Zealand', kind: 'country', latitude: -40.9, longitude: 174.8, aliases: ['new zealand'] },
    { name: 'United States', kind: 'country', latitude: 37.0, longitude: -95.7, aliases: ['united states', 'amerika serikat', 'america'] },
    { name: 'Canada', kind: 'country', latitude: 56.1, longitude: -106.3, aliases: ['canada'] },
    { name: 'United Kingdom', kind: 'country', latitude: 55.3, longitude: -3.4, aliases: ['united kingdom', 'inggris', 'britania raya'] },
    { name: 'France', kind: 'country', latitude: 46.2, longitude: 2.2, aliases: ['france', 'prancis'] },
    { name: 'Germany', kind: 'country', latitude: 51.1, longitude: 10.4, aliases: ['germany', 'jerman'] },
    { name: 'Russia', kind: 'country', latitude: 61.5, longitude: 105.3, aliases: ['russia', 'rusia'] },
    { name: 'Ukraine', kind: 'country', latitude: 48.3, longitude: 31.1, aliases: ['ukraine', 'ukraina'] },
    { name: 'Israel', kind: 'country', latitude: 31.0, longitude: 34.8, aliases: ['israel'] },
    { name: 'Palestine', kind: 'country', latitude: 31.9, longitude: 35.2, aliases: ['palestine', 'palestina', 'gaza'] },
    { name: 'Saudi Arabia', kind: 'country', latitude: 23.8, longitude: 45.0, aliases: ['saudi arabia', 'arab saudi'] },
    { name: 'Iran', kind: 'country', latitude: 32.4, longitude: 53.6, aliases: ['iran'] },
    { name: 'Turkey', kind: 'country', latitude: 38.9, longitude: 35.2, aliases: ['turkey', 'turkiye'] },
    { name: 'Brazil', kind: 'country', latitude: -14.2, longitude: -51.9, aliases: ['brazil', 'brasil'] },
    { name: 'European Union', kind: 'country', latitude: 50.1, longitude: 10.3, aliases: ['european union', 'uni eropa', 'brussels'] },

    // ── Kota Indonesia — ibukota provinsi + kota besar (sesuai cakupan RSS ID) ──
    { name: 'Jakarta', kind: 'city', latitude: -6.2, longitude: 106.81, aliases: ['jakarta', 'dki jakarta'] },
    { name: 'Bandung', kind: 'city', latitude: -6.91, longitude: 107.61, aliases: ['bandung'] },
    { name: 'Bogor', kind: 'city', latitude: -6.59, longitude: 106.81, aliases: ['bogor'] },
    { name: 'Depok', kind: 'city', latitude: -6.4, longitude: 106.79, aliases: ['depok'] },
    { name: 'Bekasi', kind: 'city', latitude: -6.23, longitude: 106.99, aliases: ['bekasi'] },
    { name: 'Tangerang', kind: 'city', latitude: -6.18, longitude: 106.63, aliases: ['tangerang'] },
    { name: 'Surabaya', kind: 'city', latitude: -7.26, longitude: 112.75, aliases: ['surabaya'] },
    { name: 'Malang', kind: 'city', latitude: -7.98, longitude: 112.63, aliases: ['malang'] },
    { name: 'Semarang', kind: 'city', latitude: -7.0, longitude: 110.42, aliases: ['semarang'] },
    { name: 'Solo', kind: 'city', latitude: -7.57, longitude: 110.82, aliases: ['solo', 'surakarta'] },
    { name: 'Yogyakarta', kind: 'city', latitude: -7.8, longitude: 110.36, aliases: ['yogyakarta', 'jogja', 'diy'] },
    { name: 'Denpasar', kind: 'city', latitude: -8.65, longitude: 115.22, aliases: ['denpasar', 'bali'] },
    { name: 'Medan', kind: 'city', latitude: 3.59, longitude: 98.67, aliases: ['medan'] },
    { name: 'Palembang', kind: 'city', latitude: -2.98, longitude: 104.76, aliases: ['palembang'] },
    { name: 'Padang', kind: 'city', latitude: -0.95, longitude: 100.35, aliases: ['padang'] },
    { name: 'Pekanbaru', kind: 'city', latitude: 0.51, longitude: 101.45, aliases: ['pekanbaru'] },
    { name: 'Batam', kind: 'city', latitude: 1.05, longitude: 104.03, aliases: ['batam'] },
    { name: 'Jambi', kind: 'city', latitude: -1.61, longitude: 103.61, aliases: ['jambi'] },
    { name: 'Bengkulu', kind: 'city', latitude: -3.79, longitude: 102.26, aliases: ['bengkulu'] },
    { name: 'Bandar Lampung', kind: 'city', latitude: -5.43, longitude: 105.27, aliases: ['bandar lampung', 'lampung'] },
    { name: 'Pangkal Pinang', kind: 'city', latitude: -2.13, longitude: 106.11, aliases: ['pangkal pinang', 'bangka'] },
    { name: 'Banda Aceh', kind: 'city', latitude: 5.55, longitude: 95.32, aliases: ['banda aceh', 'aceh'] },
    { name: 'Serang', kind: 'city', latitude: -6.12, longitude: 106.15, aliases: ['serang', 'banten'] },
    { name: 'Pontianak', kind: 'city', latitude: -0.03, longitude: 109.34, aliases: ['pontianak', 'kalimantan barat'] },
    { name: 'Palangka Raya', kind: 'city', latitude: -2.21, longitude: 113.92, aliases: ['palangka raya'] },
    { name: 'Banjarmasin', kind: 'city', latitude: -3.32, longitude: 114.59, aliases: ['banjarmasin', 'kalimantan selatan'] },
    { name: 'Balikpapan', kind: 'city', latitude: -1.24, longitude: 116.83, aliases: ['balikpapan'] },
    { name: 'Samarinda', kind: 'city', latitude: -0.5, longitude: 117.15, aliases: ['samarinda', 'kalimantan timur'] },
    { name: 'Tarakan', kind: 'city', latitude: 3.3, longitude: 117.63, aliases: ['tarakan'] },
    { name: 'Manado', kind: 'city', latitude: 1.47, longitude: 124.84, aliases: ['manado', 'sulawesi utara'] },
    { name: 'Palu', kind: 'city', latitude: -0.9, longitude: 119.87, aliases: ['palu'] },
    { name: 'Makassar', kind: 'city', latitude: -5.15, longitude: 119.43, aliases: ['makassar', 'ujung pandang'] },
    { name: 'Kendari', kind: 'city', latitude: -4.0, longitude: 122.52, aliases: ['kendari'] },
    { name: 'Mamuju', kind: 'city', latitude: -2.68, longitude: 118.89, aliases: ['mamuju'] },
    { name: 'Gorontalo', kind: 'city', latitude: 0.54, longitude: 123.06, aliases: ['gorontalo'] },
    { name: 'Ambon', kind: 'city', latitude: -3.7, longitude: 128.17, aliases: ['ambon', 'maluku'] },
    { name: 'Sorong', kind: 'city', latitude: -0.88, longitude: 131.25, aliases: ['sorong'] },
    { name: 'Ternate', kind: 'city', latitude: 0.79, longitude: 127.38, aliases: ['ternate'] },
    { name: 'Jayapura', kind: 'city', latitude: -2.53, longitude: 140.72, aliases: ['jayapura'] },
    { name: 'Merauke', kind: 'city', latitude: -8.5, longitude: 140.4, aliases: ['merauke'] },
    { name: 'Nabire', kind: 'city', latitude: -3.36, longitude: 135.53, aliases: ['nabire'] },
    { name: 'Wamena', kind: 'city', latitude: -4.1, longitude: 138.95, aliases: ['wamena'] },
    { name: 'Manokwari', kind: 'city', latitude: -0.86, longitude: 134.06, aliases: ['manokwari'] },
    { name: 'Kupang', kind: 'city', latitude: -10.18, longitude: 123.6, aliases: ['kupang'] },
    { name: 'Mataram', kind: 'city', latitude: -8.58, longitude: 116.12, aliases: ['mataram'] },

    // ── Kota internasional — pelengkap sumber RSS luar negeri ──
    { name: 'Washington, D.C.', kind: 'city', latitude: 38.9, longitude: -77.04, aliases: ['washington'] },
    { name: 'New York City', kind: 'city', latitude: 40.71, longitude: -74.01, aliases: ['new york'] },
    { name: 'San Francisco', kind: 'city', latitude: 37.77, longitude: -122.42, aliases: ['san francisco'] },
    { name: 'London', kind: 'city', latitude: 51.51, longitude: -0.13, aliases: ['london'] },
    { name: 'Paris', kind: 'city', latitude: 48.86, longitude: 2.35, aliases: ['paris'] },
    { name: 'Berlin', kind: 'city', latitude: 52.52, longitude: 13.4, aliases: ['berlin'] },
    { name: 'Tokyo', kind: 'city', latitude: 35.68, longitude: 139.69, aliases: ['tokyo', 'tokio'] },
    { name: 'Osaka', kind: 'city', latitude: 34.69, longitude: 135.5, aliases: ['osaka'] },
    { name: 'Seoul', kind: 'city', latitude: 37.57, longitude: 126.98, aliases: ['seoul'] },
    { name: 'Beijing', kind: 'city', latitude: 39.9, longitude: 116.41, aliases: ['beijing', 'peking'] },
    { name: 'Shanghai', kind: 'city', latitude: 31.23, longitude: 121.47, aliases: ['shanghai'] },
    { name: 'Hong Kong', kind: 'city', latitude: 22.32, longitude: 114.17, aliases: ['hong kong'] },
    { name: 'Taipei', kind: 'city', latitude: 25.03, longitude: 121.57, aliases: ['taipei'] },
    { name: 'Kuala Lumpur', kind: 'city', latitude: 3.14, longitude: 101.69, aliases: ['kuala lumpur'] },
    { name: 'Bangkok', kind: 'city', latitude: 13.76, longitude: 100.5, aliases: ['bangkok'] },
    { name: 'Hanoi', kind: 'city', latitude: 21.03, longitude: 105.85, aliases: ['hanoi', 'hanoi'] },
    { name: 'Manila', kind: 'city', latitude: 14.6, longitude: 120.98, aliases: ['manila'] },
    { name: 'New Delhi', kind: 'city', latitude: 28.61, longitude: 77.21, aliases: ['new delhi', 'delhi'] },
    { name: 'Sydney', kind: 'city', latitude: -33.87, longitude: 151.21, aliases: ['sydney'] },
    { name: 'Canberra', kind: 'city', latitude: -35.28, longitude: 149.13, aliases: ['canberra'] },
    { name: 'Moscow', kind: 'city', latitude: 55.76, longitude: 37.62, aliases: ['moscow', 'moskwa'] },
    { name: 'Kyiv', kind: 'city', latitude: 50.45, longitude: 30.52, aliases: ['kyiv', 'kiev'] },
    { name: 'Ankara', kind: 'city', latitude: 39.93, longitude: 32.86, aliases: ['ankara'] },
    { name: 'Istanbul', kind: 'city', latitude: 41.01, longitude: 28.98, aliases: ['istanbul'] },
    { name: 'Riyadh', kind: 'city', latitude: 24.71, longitude: 46.68, aliases: ['riyadh'] },
    { name: 'Tehran', kind: 'city', latitude: 35.69, longitude: 51.39, aliases: ['tehran'] },
    { name: 'Tel Aviv', kind: 'city', latitude: 32.09, longitude: 34.78, aliases: ['tel aviv'] },
    { name: 'Ottawa', kind: 'city', latitude: 45.42, longitude: -75.7, aliases: ['ottawa'] },
    { name: 'Brasília', kind: 'city', latitude: -15.79, longitude: -47.88, aliases: ['brasilia', 'brasília'] },
    { name: 'Nairobi', kind: 'city', latitude: -1.29, longitude: 36.82, aliases: ['nairobi'] },
    { name: 'Cape Town', kind: 'city', latitude: -33.92, longitude: 18.42, aliases: ['cape town'] },
    { name: 'Johannesburg', kind: 'city', latitude: -26.2, longitude: 28.05, aliases: ['johannesburg'] },
    { name: 'Cairo', kind: 'city', latitude: 30.04, longitude: 31.24, aliases: ['cairo', 'kahiro'] }
]

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Cari lokasi paling spesifik dari sebuah teks (judul + deskripsi event).
// Skor: panjang alias × 10 + (kota +5) + jumlah kemunculan (maks +3) — kota
// mengalahkan negara, nama panjang mengalahkan pendek ("Makassar" > "Sulawesi").
function matchLocation(text) {
    const s = String(text || '').toLowerCase()
    if (!s) return null

    let best = null
    for (const place of GAZETTEER) {
        for (const alias of place.aliases) {
            const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(alias)}(?![a-z0-9])`, 'i')
            const hits = (s.match(re) || []).length
            if (!hits) continue
            const score = alias.length * 10 + (place.kind === 'city' ? 5 : 0) + Math.min(hits, 3)
            if (!best || score > best.score) {
                best = { place, score }
            }
        }
    }

    if (!best) return null
    return {
        name: best.place.name,
        kind: best.place.kind,
        latitude: best.place.latitude,
        longitude: best.place.longitude
    }
}

// Isi koordinat untuk semua event yang masih NULL (auto, via gazetteer).
// Aman dipanggil tiap scan — tidak pernah menimpa koordinat yang sudah ada
// (manual maupun hasil gazetteer sebelumnya).
function enrichEvents(db) {
    const rows = db
        .prepare(
            `
      SELECT id, title, description
      FROM events
      WHERE latitude IS NULL OR longitude IS NULL
    `
        )
        .all()

    const update = db.prepare(
        `
      UPDATE events
      SET latitude = ?, longitude = ?, location_name = ?, location_source = 'gazetteer'
      WHERE id = ?
    `
    )

    let matched = 0
    for (const row of rows) {
        const m = matchLocation(`${row.title}\n${row.description || ''}`)
        if (!m) continue
        update.run(m.latitude, m.longitude, m.name, row.id)
        matched++
    }

    return { scanned: rows.length, matched }
}

// Fallback manual (keputusan meeting: Hybrid A+B). Validasi ketat — koordinat
// palsu lebih merusak peta daripada koordinat kosong.
function setEventLocation(db, eventId, { latitude, longitude, name }) {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new Error('latitude harus angka -90..90')
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new Error('longitude harus angka -180..180')
    }

    const cleanName = name == null || name === '' ? null : String(name).slice(0, 100)
    const res = db
        .prepare(
            `
      UPDATE events
      SET latitude = ?, longitude = ?, location_name = ?, location_source = 'manual'
      WHERE id = ?
    `
        )
        .run(lat, lng, cleanName, eventId)

    if (res.changes === 0) throw new Error('event tidak ditemukan')
    return { latitude: lat, longitude: lng, locationName: cleanName, locationSource: 'manual' }
}

function clearEventLocation(db, eventId) {
    const res = db
        .prepare(
            `
      UPDATE events
      SET latitude = NULL, longitude = NULL, location_name = NULL, location_source = NULL
      WHERE id = ?
    `
        )
        .run(eventId)
    if (res.changes === 0) throw new Error('event tidak ditemukan')
    return { cleared: true }
}

module.exports = { GAZETTEER, matchLocation, enrichEvents, setEventLocation, clearEventLocation }
