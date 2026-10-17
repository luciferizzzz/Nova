const express = require('express')

const router = express.Router()

const DEFAULT_HOURS = 24
const MAX_HOURS = 24 * 30
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const ARTICLES_PER_EVENT = 3

function parseHours(value) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_HOURS) : DEFAULT_HOURS
}

function parseLimit(value) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT
}

// Tab TRENDING berbasis velocity — laju artikel per jam per event.
// Mengganti perilaku lama (feed 24 jam biasa yang hanya urut recency) dengan
// peringkat event: seberapa cepat artikel baru masuk ke klaster event tersebut.
// Read-only, memakai event_articles + berita.created_at yang sudah ada —
// tanpa dependency/model baru, selaras dengan Phase 8.
router.get('/', (req, res) => {
  const hours = parseHours(req.query.hours)
  const limit = parseLimit(req.query.limit)
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()

  // Filter setingkat artikel (konsisten dengan /api/berita) dipakai untuk
  // menghitung velocity DAN artikel tampilan, agar angka & daftar selalu cocok.
  const clauses = ['b.created_at >= ?']
  const params = [since]
  if (req.query.negara) {
    clauses.push('b.negara = ?')
    params.push(req.query.negara)
  }
  if (req.query.kategori) {
    clauses.push('b.kategori = ?')
    params.push(req.query.kategori)
  }
  if (req.query.sumber) {
    clauses.push('b.sumber = ?')
    params.push(req.query.sumber)
  }
  if (req.query.bahasa) {
    clauses.push('b.bahasa = ?')
    params.push(req.query.bahasa)
  }
  const where = clauses.join(' AND ')

  const events = req.db
    .prepare(
      `
      SELECT e.id, e.stable_id, e.title, e.category,
             COUNT(b.id) AS recent_count,
             COUNT(DISTINCT b.sumber) AS source_count,
             (SELECT COUNT(*) FROM event_articles ea2 WHERE ea2.event_id = e.id) AS total_count,
             MIN(b.created_at) AS first_at,
             MAX(b.created_at) AS last_at
      FROM events e
      JOIN event_articles ea ON ea.event_id = e.id
      JOIN berita b ON b.id = ea.article_id
      WHERE ${where}
      GROUP BY e.id
      HAVING COUNT(b.id) > 0
      ORDER BY recent_count DESC, last_at DESC
      LIMIT ?
    `
    )
    .all(...params, limit)

  const articleStmt = req.db.prepare(
    `
    SELECT b.id, b.slug, b.judul, b.sumber, b.negara, b.kategori, b.created_at
    FROM event_articles ea
    JOIN berita b ON b.id = ea.article_id
    WHERE ea.event_id = ? AND ${where}
    ORDER BY b.created_at DESC
    LIMIT ?
  `
  )

  for (const ev of events) {
    ev.velocity = Number((ev.recent_count / hours).toFixed(2))
    ev.articles = articleStmt.all(ev.id, ...params, ARTICLES_PER_EVENT)
  }

  res.json({ hours, since, count: events.length, events })
})

module.exports = router
