const express = require('express')

const router = express.Router()

router.get('/', (req, res) => {
  const rows = req.db.prepare('SELECT key, value FROM settings ORDER BY key').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  res.json(settings)
})

router.put('/', (req, res) => {
  const body = req.body ?? {}
  if (typeof body !== 'object' || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Empty update payload' })
  }

  const upsert = req.db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)

  for (const [key, value] of Object.entries(body)) {
    if (typeof key !== 'string' || value === undefined) continue
    upsert.run(key, String(value))
  }

  const rows = req.db.prepare('SELECT key, value FROM settings ORDER BY key').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  res.json(settings)
})

module.exports = router