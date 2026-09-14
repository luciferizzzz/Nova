const express = require('express')
const { fetchAllSources } = require('../services/rssFetcher')

const router = express.Router()

const STRING_FIELDS = ['name', 'rss_url', 'country', 'language', 'category']

function cleanFields(body) {
  const out = {}
  for (const field of STRING_FIELDS) {
    if (typeof body[field] === 'string') {
      out[field] = body[field].trim()
    }
  }
  return out
}

router.get('/', (req, res) => {
  const sources = req.db
    .prepare(
      `
      SELECT s.*, (SELECT COUNT(*) FROM berita b WHERE b.sumber = s.name) AS article_count
      FROM sources s
      ORDER BY s.country, s.name
    `
    )
    .all()
  res.json(sources)
})

router.post('/', (req, res) => {
  const fields = cleanFields(req.body ?? {})
  if (!fields.name || !fields.rss_url) {
    return res.status(400).json({ error: 'Name and RSS URL required' })
  }

  const result = req.db
    .prepare(
      `
      INSERT INTO sources (name, rss_url, country, language, category, enabled, status)
      VALUES (?, ?, ?, ?, ?, 1, 'active')
    `
    )
    .run(
      fields.name,
      fields.rss_url,
      fields.country || 'Indonesia',
      fields.language || 'id',
      fields.category || 'Other'
    )

  res.json({ success: true, id: Number(result.lastInsertRowid) })
})

router.post('/refresh', async (req, res) => {
  try {
    const result = await fetchAllSources(req.db)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', (req, res) => {
  const source = req.db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id)
  if (!source) return res.status(404).json({ error: 'Source not found' })
  res.json(source)
})

router.put('/:id', (req, res) => {
  const source = req.db.prepare('SELECT id FROM sources WHERE id = ?').get(req.params.id)
  if (!source) return res.status(404).json({ error: 'Source not found' })

  const fields = cleanFields(req.body ?? {})
  const enabled = typeof req.body.enabled === 'boolean' ? (req.body.enabled ? 1 : 0) : undefined
  if (!fields.name && !fields.rss_url && !fields.country && !fields.language && !fields.category && enabled === undefined) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  req.db
    .prepare(
      `
      UPDATE sources SET
        name = COALESCE(?, name),
        rss_url = COALESCE(?, rss_url),
        country = COALESCE(?, country),
        language = COALESCE(?, language),
        category = COALESCE(?, category),
        enabled = COALESCE(?, enabled)
      WHERE id = ?
    `
    )
    .run(fields.name, fields.rss_url, fields.country, fields.language, fields.category, enabled, req.params.id)

  const updated = req.db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const result = req.db.prepare('DELETE FROM sources WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Source not found' })
  res.json({ success: true })
})

module.exports = router