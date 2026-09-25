const express = require('express')

const router = express.Router()

const TYPES = ['topic', 'entity', 'keyword', 'source', 'category', 'country']
const SEARCH_FIELDS = ['judul', 'konten', 'sumber', 'kategori', 'negara', 'bahasa']

router.get('/', (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM watchlist ORDER BY created_at DESC')
    .all()

  const items = rows.map((row) => {
    const like = `%${row.value}%`
    const count = req.db
      .prepare(
        `SELECT COUNT(*) AS count FROM berita WHERE ${SEARCH_FIELDS.map((f) => `${f} LIKE ?`).join(' OR ')}`
      )
      .get(...SEARCH_FIELDS.map(() => like)).count
    return { ...row, count }
  })

  res.json(items)
})

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const type = String(req.body?.type || 'keyword')
  const value = String(req.body?.value || '').trim()

  if (!name || !value) return res.status(400).json({ error: 'name and value are required' })
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` })
  }

  const result = req.db
    .prepare('INSERT INTO watchlist (name, type, value) VALUES (?, ?, ?)')
    .run(name, type, value)
  res.json({ id: Number(result.lastInsertRowid), name, type, value, count: 0 })
})

router.delete('/:id', (req, res) => {
  const result = req.db.prepare('DELETE FROM watchlist WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Watchlist item not found' })
  res.json({ success: true })
})

module.exports = router