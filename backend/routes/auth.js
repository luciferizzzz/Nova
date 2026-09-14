const express = require('express')
const { hashPassword, verifyPassword } = require('../utils/password')
const { requireAuth } = require('../middleware/auth')
const {
  SESSION_COOKIE,
  createSession,
  destroySession,
  isValidSession,
  cookieOptions,
  clearCookieOptions
} = require('../services/session')

const router = express.Router()

router.get('/api/auth/status', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE]
  res.json({ authenticated: isValidSession(token) })
})

router.post('/api/auth/login', (req, res) => {
  const { password } = req.body ?? {}
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' })
  }

  const row = req.db.prepare('SELECT id, password_hash FROM auth ORDER BY id LIMIT 1').get()
  if (!row || !verifyPassword(row.password_hash, password)) {
    return res.status(401).json({ error: 'Wrong password' })
  }

  const token = createSession()
  res.cookie(SESSION_COOKIE, token, cookieOptions())
  res.json({ authenticated: true })
})

router.post('/api/auth/logout', requireAuth, (req, res) => {
  destroySession(req.sessionToken)
  res.clearCookie(SESSION_COOKIE, clearCookieOptions())
  res.json({ authenticated: false })
})

router.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  const row = req.db.prepare('SELECT id, password_hash FROM auth ORDER BY id LIMIT 1').get()
  if (!verifyPassword(row.password_hash, currentPassword)) {
    return res.status(401).json({ error: 'Current password is wrong' })
  }

  const newHash = hashPassword(newPassword)
  req.db
    .prepare(
      `UPDATE auth SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(newHash, row.id)

  res.json({ ok: true })
})

module.exports = router