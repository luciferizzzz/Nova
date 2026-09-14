const { SESSION_COOKIE, isValidSession } = require('../services/session')

function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.sessionToken = token
  next()
}

module.exports = { requireAuth }