const express = require('express')
const { detectEvents } = require('../services/eventEngine')
const { enrichEvents, setEventLocation, clearEventLocation } = require('../services/locationEnricher')

const router = express.Router()

function parseLimit(value) {
  const limit = parseInt(value, 10)
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50
}

router.get('/', (req, res) => {
  const { q, category } = req.query
  const limit = parseLimit(req.query.limit)
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

  let sql = `
    SELECT e.*, COUNT(ea.article_id) AS article_count
    FROM events e
    LEFT JOIN event_articles ea ON ea.event_id = e.id
    WHERE 1=1
  `
  const params = []

  if (q) {
    sql += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.category LIKE ?)'
    const like = `%${q}%`
    params.push(like, like, like)
  }
  if (category) {
    sql += ' AND e.category = ?'
    params.push(category)
  }

  sql += ' GROUP BY e.id ORDER BY article_count DESC, e.updated_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const events = req.db.prepare(sql).all(...params)
  for (const e of events) {
    if (e.summary) e.summary = e.summary
  }

  let countSql = 'SELECT COUNT(*) AS count FROM events WHERE 1=1'
  let catSql = `
    SELECT category, COUNT(*) AS count
    FROM events
    WHERE 1=1
  `
  let whereParams = []
  if (q) {
    const like = `%${q}%`
    countSql += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)'
    catSql += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)'
    whereParams.push(like, like, like)
  }
  if (category) {
    countSql += ' AND category = ?'
    catSql += ' AND category = ?'
    whereParams.push(category)
  }
  catSql += ' GROUP BY category ORDER BY count DESC'

  const total = req.db.prepare(countSql).get(...whereParams).count
  const categories = req.db.prepare(catSql).all(...whereParams)

  res.json({ total, categories, events })
})

router.get('/:id', (req, res) => {
  const event = req.db
    .prepare(
      `
      SELECT e.*,
             (SELECT COUNT(*) FROM event_articles ea WHERE ea.event_id = e.id) AS article_count
      FROM events e
      WHERE e.id = ?
    `
    )
    .get(req.params.id)

  if (!event) return res.status(404).json({ error: 'Event not found' })

  const articles = req.db
    .prepare(
      `
      SELECT b.*, (bm.id IS NOT NULL) AS bookmarked
      FROM event_articles ea
      JOIN berita b ON b.id = ea.article_id
      LEFT JOIN bookmarks bm ON bm.article_id = b.id
      WHERE ea.event_id = ?
      ORDER BY b.created_at DESC
    `
    )
    .all(event.id)

  res.json({ ...event, articles })
})

router.post('/scan', async (req, res) => {
  try {
    const result = detectEvents(req.db)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Jalankan location enrichment manual (Phase 9 Milestone A) tanpa scan ulang.
router.post('/enrich', (req, res) => {
  try {
    const result = enrichEvents(req.db)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Set koordinat manual per event (fallback Hybrid A+B — keputusan 2026-10-17).
router.put('/:id/location', (req, res) => {
  try {
    const result = setEventLocation(req.db, req.params.id, req.body || {})
    res.json({ success: true, ...result })
  } catch (err) {
    const notFound = /tidak ditemukan/.test(err.message)
    res.status(notFound ? 404 : 400).json({ error: err.message })
  }
})

// Hapus koordinat manual → event jadi kandidat auto di scan berikutnya.
router.delete('/:id/location', (req, res) => {
  try {
    const result = clearEventLocation(req.db, req.params.id)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

module.exports = router