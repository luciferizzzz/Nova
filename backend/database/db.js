const fs = require('fs')
const { DatabaseSync } = require('node:sqlite')
const config = require('../config')
const { hashPassword } = require('../utils/password')
const { applySchema } = require('./schema')

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true })
  fs.mkdirSync(config.cacheDir, { recursive: true })
}

function seedDefaultAuth(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM auth').get()
  if (row.count === 0) {
    db.prepare('INSERT INTO auth (password_hash) VALUES (?)').run(hashPassword('123456'))
  }
}

function seedDefaultSettings(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  insert.run('rss_refresh_interval', String(config.rssRefreshInterval))
}

function initDatabase() {
  ensureDataDir()
  const db = new DatabaseSync(config.databasePath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  applySchema(db)
  seedDefaultAuth(db)
  seedDefaultSettings(db)
  return db
}

module.exports = { initDatabase, applySchema }