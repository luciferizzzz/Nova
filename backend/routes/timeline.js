const express = require('express')

const router = express.Router()

const MAX_DAYS = 120
const DEFAULT_DAYS = 30
const MAX_ARTICLES_PER_DAY = 12
const MAX_SOURCES_PER_DAY = 5

function parseDays(value) {
  const days = parseInt(value, 10)
  return Number.isInteger(days) && days > 0 ? Math.min(days, MAX_DAYS) : DEFAULT_DAYS
}

function toDay(value, fallback) {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toISOString().slice(0, 10)
}

function shiftDay(day, delta) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function buildFilters(query) {
  const clauses = []
  const params = []

  if (query.negara) {
    clauses.push('b.negara = ?')
    params.push(query.negara)
  }
  if (query.kategori) {
    clauses.push('b.kategori = ?')
    params.push(query.kategori)
  }
  if (query.sumber) {
    clauses.push('b.sumber = ?')
    params.push(query.sumber)
  }

  return { clauses, params }
}

router.get('/', (req, res) => {
  const days = parseDays(req.query.days)
  const today = new Date().toISOString().slice(0, 10)
  const to = toDay(req.query.to, today)
  const from = req.query.from ? toDay(req.query.from, shiftDay(to, -(days - 1))) : shiftDay(to, -(days - 1))

  const { clauses, params } = buildFilters(req.query)
  const range = ['date(b.created_at) BETWEEN ? AND ?']
  const rangeParams = [from, to]
  const where = `WHERE ${[...clauses, ...range].join(' AND ')}`
  const args = [...params, ...rangeParams]
  const span = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1

  const daily = req.db
    .prepare(`SELECT date(b.created_at) AS day, COUNT(*) AS count FROM berita b ${where} GROUP BY day ORDER BY day DESC`)
    .all(...args)

  const byCategory = req.db
    .prepare(`
      SELECT date(b.created_at) AS day, b.kategori AS category, COUNT(*) AS count
      FROM berita b ${where}
      GROUP BY day, category
    `)
    .all(...args)

  const bySource = req.db
    .prepare(`
      SELECT date(b.created_at) AS day, b.sumber AS source, COUNT(*) AS count
      FROM berita b ${where}
      GROUP BY day, source
    `)
    .all(...args)

  const categoryTotals = req.db
    .prepare(`
      SELECT b.kategori AS category, COUNT(*) AS count
      FROM berita b ${where}
      GROUP BY category
      ORDER BY count DESC
    `)
    .all(...args)

  const hours = req.db
    .prepare(`
      SELECT CAST(strftime('%H', b.created_at) AS INTEGER) AS hour, COUNT(*) AS count
      FROM berita b ${where}
      GROUP BY hour
    `)
    .all(...args)

  const articleRows = req.db
    .prepare(`
      SELECT * FROM (
        SELECT b.id, b.slug, b.judul, b.konten, b.gambar, b.kategori, b.negara, b.bahasa,
               b.sumber, b.link_asli, b.created_at,
               (bm.id IS NOT NULL) AS bookmarked,
               date(b.created_at) AS day,
               ROW_NUMBER() OVER (PARTITION BY date(b.created_at) ORDER BY b.created_at DESC) AS rn
        FROM berita b
        LEFT JOIN bookmarks bm ON bm.article_id = b.id
        ${where}
      )
      WHERE rn <= ?
      ORDER BY day DESC, created_at DESC
    `)
    .all(...args, MAX_ARTICLES_PER_DAY)

  const byDay = new Map(daily.map((d) => [d.day, { ...d, categories: [], sources: [], articles: [] }]))

  for (const row of byCategory) {
    const bucket = byDay.get(row.day)
    if (bucket) bucket.categories.push({ category: row.category, count: row.count })
  }
  for (const row of bySource) {
    const bucket = byDay.get(row.day)
    if (!bucket) continue
    row.count = Number(row.count)
    bucket.sources.push({ source: row.source, count: row.count })
    bucket.sources.sort((a, b) => b.count - a.count)
    bucket.sources = bucket.sources.slice(0, MAX_SOURCES_PER_DAY)
  }
  for (const row of articleRows) {
    const { rn, ...article } = row
    const bucket = byDay.get(row.day)
    if (bucket) bucket.articles.push(article)
  }

  const hoursFilled = Array.from({ length: 24 }, (_, hour) => {
    const found = hours.find((h) => h.hour === hour)
    return { hour, count: found ? found.count : 0 }
  })

  const total = daily.reduce((sum, d) => sum + d.count, 0)
  const peak = daily.reduce((best, d) => (!best || d.count > best.count ? d : best), null)

  res.json({
    range: { from, to, days: Math.max(span, 1) },
    total,
    peak: peak ? { day: peak.day, count: peak.count } : null,
    hours: hoursFilled,
    categories: categoryTotals,
    days: [...byDay.values()]
  })
})

module.exports = router
