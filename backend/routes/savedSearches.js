const express = require('express')

const router = express.Router()

router.get('/', (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM saved_searches ORDER BY created_at DESC')
    .all()
  res.json(rows)
})

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const query = String(req.body?.query || '').trim()
  if (!name || !query) {
    return res.status(400).json({ error: 'name and query are required' })
  }

  const result = req.db
    .prepare('INSERT INTO saved_searches (name, query) VALUES (?, ?)')
    .run(name, query)
  res.json({ id: Number(result.lastInsertRowid), name, query })
})

router.delete('/:id', (req, res) => {
  const result = req.db
    .prepare('DELETE FROM saved_searches WHERE id = ?')
    .run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Saved search not found' })
  res.json({ success: true })
})

module.exports = router