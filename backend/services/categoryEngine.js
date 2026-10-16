const DEFAULT_DAYS = 30
const DEFAULT_LIMIT = 20
const MAX_DAYS = 365
const MAX_LIMIT = 50
const TREND_RECENT_DAYS = 7
const MAX_HEADLINES = 5
const MAX_SOURCES = 6
const OTHER = 'Other'

// Kategori kosong/null dinormalisasi ke "Other" agar konsisten dengan
// pemetaan `categoryClass` di frontend dan filter kategori.
function normalizeCategory(value) {
  const c = String(value == null ? '' : value).trim()
  return c || OTHER
}

function padDaily(map, days) {
  const out = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: map.get(key) || 0 })
  }
  return out
}

// Agregasi read-only per kategori (berita.kategori): jumlah artikel, keragaman
// sumber & negara, tren 7-hari terakhir vs 7-hari sebelumnya, sparkline harian,
// sumber teratas, dan headline terbaru. Deterministik, memakai data yang sudah
// ada (`berita` saja) — tanpa model/dependency baru, selaras dengan Phase 8.
function extractCategories(db, { days = DEFAULT_DAYS, limit = DEFAULT_LIMIT } = {}) {
  const d = Math.min(Math.max(parseInt(days, 10) || DEFAULT_DAYS, 1), MAX_DAYS)
  const lim = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const now = Date.now()
  const sinceMs = now - d * 24 * 3600 * 1000
  const since = new Date(sinceMs).toISOString()

  // Jendela tren (tetap 7 hari vs 7 hari sebelumnya) dihitung terlepas dari
  // `days`, agar rentang pendek (mis. 7 hari) tetap punya pembanding. Artikel
  // dimuat sejak titik paling awal di antara keduanya.
  const recentCutMs = now - TREND_RECENT_DAYS * 24 * 3600 * 1000
  const prevCutMs = now - 2 * TREND_RECENT_DAYS * 24 * 3600 * 1000
  const loadSince = new Date(Math.min(sinceMs, prevCutMs)).toISOString()

  const articles = db
    .prepare(
      `SELECT id, judul, slug, sumber, negara, kategori, created_at
       FROM berita
       WHERE created_at >= ?
       ORDER BY created_at DESC`
    )
    .all(loadSince)

  const stats = new Map()
  for (const a of articles) {
    const key = normalizeCategory(a.kategori)
    let s = stats.get(key)
    if (!s) {
      s = {
        kategori: key,
        count: 0,
        sources: new Set(),
        countries: new Set(),
        recent: 0,
        prev: 0,
        daily: new Map(),
        sourceCounts: new Map(),
        headlines: [],
        last_at: null
      }
      stats.set(key, s)
    }

    // Tren dihitung untuk semua artikel yang dimuat (bisa di luar jendela `days`).
    const t = new Date(a.created_at).getTime()
    if (t >= recentCutMs) s.recent++
    else if (t >= prevCutMs) s.prev++

    // Agregasi tampilan hanya untuk artikel di dalam jendela `days`.
    if (t < sinceMs) continue

    s.count++
    if (a.sumber) {
      s.sources.add(a.sumber)
      s.sourceCounts.set(a.sumber, (s.sourceCounts.get(a.sumber) || 0) + 1)
    }
    if (a.negara) s.countries.add(a.negara)
    const dk = String(a.created_at || '').slice(0, 10)
    s.daily.set(dk, (s.daily.get(dk) || 0) + 1)
    if (!s.last_at || a.created_at > s.last_at) s.last_at = a.created_at
    if (s.headlines.length < MAX_HEADLINES) {
      s.headlines.push({ id: a.id, judul: a.judul, slug: a.slug, sumber: a.sumber, created_at: a.created_at })
    }
  }

  const categories = []
  for (const s of stats.values()) {
    if (s.count === 0) continue // kategori hanya muncul di jendela tren, bukan di rentang terpilih
    const sourceList = [...s.sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, MAX_SOURCES)
      .map(([sumber, count]) => ({ sumber, count }))
    categories.push({
      kategori: s.kategori,
      count: s.count,
      sources: s.sources.size,
      countries: s.countries.size,
      recent: s.recent,
      prev: s.prev,
      trend: s.recent - s.prev,
      last_at: s.last_at,
      daily: padDaily(s.daily, d),
      sourceList,
      headlines: s.headlines
    })
  }

  categories.sort(
    (a, b) => b.count - a.count || b.sources - a.sources || b.recent - a.recent || (a.kategori < b.kategori ? -1 : 1)
  )

  return {
    days: d,
    since,
    total: categories.length,
    articles: categories.reduce((sum, c) => sum + c.count, 0),
    categories: categories.slice(0, lim)
  }
}

module.exports = { extractCategories, normalizeCategory, DEFAULT_DAYS, MAX_DAYS }
