const express = require('express')

const router = express.Router()

const SEARCH_FIELDS = ['judul', 'konten', 'sumber', 'kategori', 'negara', 'bahasa']

function parseLimit(value) {
  const limit = parseInt(value, 10)
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 50
}

router.get('/stats', (req, res) => {
  const count = (sql) => req.db.prepare(sql).get().count

  const articles = count('SELECT COUNT(*) AS count FROM berita')
  const today = count("SELECT COUNT(*) AS count FROM berita WHERE date(created_at) = date('now')")
  const sourcesTotal = count('SELECT COUNT(*) AS count FROM sources')
  const sourcesActive = count('SELECT COUNT(*) AS count FROM sources WHERE enabled = 1')
  const events = count('SELECT COUNT(*) AS count FROM events')
  const countries = count('SELECT COUNT(DISTINCT negara) AS count FROM berita')
  const lastUpdate = req.db.prepare('SELECT MAX(created_at) AS value FROM berita').get().value
  const dbSize = (() => {
    try {
      return require('fs').statSync(require('../config').databasePath).size
    } catch {
      return 0
    }
  })()

  res.json({
    articles,
    today,
    sourcesTotal,
    sourcesActive,
    events,
    countries,
    lastUpdate,
    dbSize
  })
})

router.get('/', (req, res) => {
  const { negara, kategori, bahasa, sumber, q, from, to } = req.query
  const limit = parseLimit(req.query.limit)
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

  let sql = `
    SELECT b.*, (bm.id IS NOT NULL) AS bookmarked
    FROM berita b
    LEFT JOIN bookmarks bm ON bm.article_id = b.id
    WHERE 1=1
  `
  const params = []

  if (negara) {
    sql += ' AND b.negara = ?'
    params.push(negara)
  }
  if (kategori) {
    sql += ' AND b.kategori = ?'
    params.push(kategori)
  }
  if (bahasa) {
    sql += ' AND b.bahasa = ?'
    params.push(bahasa)
  }
  if (sumber) {
    sql += ' AND b.sumber = ?'
    params.push(sumber)
  }
  if (from) {
    sql += ' AND b.created_at >= ?'
    params.push(new Date(from).toISOString())
  }
  if (to) {
    sql += ' AND b.created_at <= ?'
    params.push(new Date(to).toISOString())
  }
  if (q) {
    const like = `%${q}%`
    sql += ` AND (${SEARCH_FIELDS.map((f) => `b.${f} LIKE ?`).join(' OR ')})`
    params.push(...SEARCH_FIELDS.map(() => like))
  }

  sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const berita = req.db.prepare(sql).all(...params)
  res.json(berita)
})

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json([])
  const limit = parseLimit(req.query.limit)

  const like = `%${q}%`
  const berita = req.db
    .prepare(
      `
      SELECT b.*, (bm.id IS NOT NULL) AS bookmarked
      FROM berita b
      LEFT JOIN bookmarks bm ON bm.article_id = b.id
      WHERE (${SEARCH_FIELDS.map((f) => `b.${f} LIKE ?`).join(' OR ')})
      ORDER BY b.created_at DESC
      LIMIT ?
    `
    )
    .all(...SEARCH_FIELDS.map(() => like), limit)

  res.json(berita)
})

// "Also reported by" — corroboration antar sumber untuk satu artikel.
// Memakai event yang sudah diklaster (event_articles): artikel lain di event
// yang sama, dari sumber berbeda, adalah bukti liputan lintas sumber.
router.get('/:slug/corroboration', (req, res) => {
  const artikel = req.db
    .prepare('SELECT id, sumber FROM berita WHERE slug = ?')
    .get(req.params.slug)

  if (!artikel) return res.status(404).json({ error: 'Article not found' })

  const event = req.db
    .prepare(
      `
      SELECT e.id, e.stable_id, e.title, e.category
      FROM events e
      JOIN event_articles ea ON ea.event_id = e.id
      WHERE ea.article_id = ?
      LIMIT 1
    `
    )
    .get(artikel.id)

  if (!event) return res.json({ event: null, sourceCount: 0, sources: [], articles: [] })

  const total = req.db
    .prepare('SELECT COUNT(*) AS count FROM event_articles WHERE event_id = ?')
    .get(event.id).count

  const articles = req.db
    .prepare(
      `
      SELECT b.id, b.slug, b.judul, b.sumber, b.negara, b.created_at
      FROM event_articles ea
      JOIN berita b ON b.id = ea.article_id
      WHERE ea.event_id = ? AND b.id != ?
        AND b.sumber IS NOT NULL AND b.sumber != ?
      ORDER BY b.created_at DESC
    `
    )
    .all(event.id, artikel.id, artikel.sumber || '')

  const counts = new Map()
  for (const a of articles) counts.set(a.sumber, (counts.get(a.sumber) || 0) + 1)
  const sources = [...counts.entries()]
    .map(([sumber, count]) => ({ sumber, count }))
    .sort((a, b) => b.count - a.count || a.sumber.localeCompare(b.sumber))

  res.json({
    event: { ...event, article_count: total },
    sourceCount: sources.length,
    sources,
    articles
  })
})

router.get('/:slug', (req, res) => {
  const artikel = req.db
    .prepare(
      `
      SELECT b.*, (bm.id IS NOT NULL) AS bookmarked
      FROM berita b
      LEFT JOIN bookmarks bm ON bm.article_id = b.id
      WHERE b.slug = ?
    `
    )
    .get(req.params.slug)

  if (!artikel) return res.status(404).json({ error: 'Article not found' })
  res.json(artikel)
})

module.exports = router