const express = require('express')

const router = express.Router()

const ALLOWED_KEYS = new Set(['rss_refresh_interval', 'language', 'country', 'theme'])

const VALIDATORS = {
  rss_refresh_interval: (value) => {
    const n = parseInt(value, 10)
    return Number.isInteger(n) && n >= 5 && n <= 1440 ? String(n) : null
  },
  language: (value) => (['id', 'en', 'ja', 'ko'].includes(value) ? value : null),
  country: (value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 100) : null),
  theme: (value) => (['dark', 'light'].includes(value) ? value : null)
}

function getAllSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

router.get('/', (req, res) => {
  res.json(getAllSettings(req.db))
})

router.put('/', (req, res) => {
  const body = req.body ?? {}
  if (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Empty update payload' })
  }

  const upsert = req.db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)

  let updated = 0
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key) || value === undefined || value === null) continue
    const validated = VALIDATORS[key] ? VALIDATORS[key](value) : value
    if (validated === null) continue
    upsert.run(key, String(validated))
    updated++
  }

  if (updated === 0) {
    return res.status(400).json({ error: 'Invalid or empty update payload' })
  }

  res.json(getAllSettings(req.db))
})

module.exports = router