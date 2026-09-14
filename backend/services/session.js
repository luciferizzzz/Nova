const crypto = require('crypto')

const SESSION_COOKIE = 'nova_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const sessions = new Map()

function createSession() {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { createdAt: Date.now() })
  return token
}

function destroySession(token) {
  if (token) {
    sessions.delete(token)
  }
}

function isValidSession(token) {
  if (!token) return false
  const session = sessions.get(token)
  if (!session) return false
  const expired = Date.now() - session.createdAt > SESSION_TTL_MS
  if (expired) {
    sessions.delete(token)
    return false
  }
  return true
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000
  }
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  }
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  destroySession,
  isValidSession,
  cookieOptions,
  clearCookieOptions
}