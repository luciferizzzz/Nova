const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const config = require('../config')
const { hashPassword } = require('../utils/password')

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true })
  fs.mkdirSync(config.cacheDir, { recursive: true })
}

function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS berita (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        judul VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        konten TEXT,
        gambar VARCHAR(255),
        kategori VARCHAR(100),
        negara VARCHAR(100),
        bahasa VARCHAR(50),
        sumber VARCHAR(100),
        link_asli TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        rss_url TEXT NOT NULL,
        country VARCHAR(100),
        language VARCHAR(50),
        category VARCHAR(100),
        enabled BOOLEAN DEFAULT 1,
        last_fetch DATETIME,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES berita(id)
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        query TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_berita_kategori ON berita(kategori);
    CREATE INDEX IF NOT EXISTS idx_berita_negara ON berita(negara);
    CREATE INDEX IF NOT EXISTS idx_berita_sumber ON berita(sumber);
    CREATE INDEX IF NOT EXISTS idx_berita_created ON berita(created_at);
    CREATE INDEX IF NOT EXISTS idx_berita_slug ON berita(slug);
  `)
}

function initDatabase() {
  ensureDataDir()
  const db = new DatabaseSync(config.databasePath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  applySchema(db)
  seedDefaultAuth(db)
  return db
}

function seedDefaultAuth(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM auth').get()
  if (row.count === 0) {
    db.prepare('INSERT INTO auth (password_hash) VALUES (?)').run(hashPassword('123456'))
  }
}

module.exports = { initDatabase, applySchema }
