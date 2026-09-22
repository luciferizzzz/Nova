const express = require('express')
const { slugify } = require('../services/newsNormalizer')

const router = express.Router()

const EXPORT_VERSION = 1

const ALLOWED_SETTING_KEYS = ['rss_refresh_interval', 'language', 'country', 'theme']
const IMPORT_BATCH = 200

function todayStamp() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function escapeCSV(value) {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(escapeCSV).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(','))
  }
  return lines.join('\r\n')
}

router.get('/export', (req, res) => {
  const db = req.db
  const format = String(req.query.format || 'json').toLowerCase() === 'csv' ? 'csv' : 'json'

  if (format === 'csv') {
    const rows = db
      .prepare(
        `
        SELECT id, judul, slug, kategori, negara, bahasa, sumber, link_asli, gambar, created_at
        FROM berita
        ORDER BY created_at DESC
      `
      )
      .all()
    const csv = toCSV(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="nova-news-${todayStamp()}.csv"`)
    return res.send(csv)
  }

  const data = {
    app: 'nova',
    exported_at: new Date().toISOString(),
    version: EXPORT_VERSION,
    data: {
      berita: db.prepare('SELECT * FROM berita ORDER BY id').all(),
      sources: db.prepare('SELECT * FROM sources ORDER BY id').all(),
      bookmarks: db
        .prepare(
          `
          SELECT bm.id AS bookmark_id, bm.article_id, b.link_asli, bm.created_at
          FROM bookmarks bm
          LEFT JOIN berita b ON b.id = bm.article_id
          ORDER BY bm.id
        `
        )
        .all(),
      settings: db.prepare('SELECT key, value FROM settings ORDER BY key').all()
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="nova-export-${todayStamp()}.json"`)
  res.json(data)
})

router.post('/import', (req, res) => {
  const db = req.db
  const payload = req.body ?? {}
  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload

  const results = { berita: 0, sources: 0, bookmarks: 0, settings: 0 }

  const settings = Array.isArray(data.settings) ? data.settings : []
  const sources = Array.isArray(data.sources) ? data.sources : []
  const berita = Array.isArray(data.berita) ? data.berita : []
  const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : []

  try {
    const upsertSetting = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    for (const s of settings) {
      if (!s || !ALLOWED_SETTING_KEYS.includes(s.key) || s.value === undefined) continue
      upsertSetting.run(s.key, String(s.value))
      results.settings++
    }

    const findSource = db.prepare('SELECT id FROM sources WHERE name = ?')
    const insertSource = db.prepare(`
      INSERT INTO sources (name, rss_url, country, language, category, enabled, status, last_fetch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const s of sources) {
      if (!s || !s.name || !s.rss_url) continue
      if (findSource.get(s.name)) continue
      insertSource.run(
        String(s.name).slice(0, 200),
        String(s.rss_url),
        s.country || 'Indonesia',
        s.language || 'en',
        s.category || 'Other',
        s.enabled === false ? 0 : 1,
        s.status === 'error' ? 'error' : 'active',
        s.last_fetch || null
      )
      results.sources++
    }

    const findLink = db.prepare('SELECT id FROM berita WHERE link_asli = ?')
    const findSlug = db.prepare('SELECT id FROM berita WHERE slug = ?')
    const insertBerita = db.prepare(`
      INSERT INTO berita (judul, slug, konten, gambar, kategori, negara, bahasa, sumber, link_asli, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const linkSet = new Set()
    let suffix = {}
    const slugOf = (a) => {
      const base = String(a.slug || '').slice(0, 110) || slugify(a.judul) || 'artikel'
      let slug = base
      let i = 2
      while (findSlug.get(slug)) {
        slug = `${base.slice(0, 110)}-${i}`
        i++
      }
      return slug
    }

    for (const a of berita) {
      if (!a || !a.judul) continue
      const link = String(a.link_asli || '')
      if (link) {
        if (findLink.get(link) || linkSet.has(link)) continue
        linkSet.add(link)
      }
      const slug = slugOf(a)
      insertBerita.run(
        String(a.judul).slice(0, 500),
        slug,
        a.konten || '',
        a.gambar || '',
        a.kategori || 'Other',
        a.negara || 'Indonesia',
        a.bahasa || 'en',
        a.sumber || 'Imported',
        link,
        a.created_at || null
      )
      results.berita++
    }

    const findArticleByLink = db.prepare('SELECT id FROM berita WHERE link_asli = ?')
    const existingBookmark = db.prepare('SELECT id FROM bookmarks WHERE article_id = ?')
    const insertBookmark = db.prepare('INSERT INTO bookmarks (article_id) VALUES (?)')
    for (const b of bookmarks) {
      if (!b) continue
      let articleId = parseInt(b.article_id, 10)
      let link = b.link_asli ? String(b.link_asli) : ''
      if (!Number.isInteger(articleId) || articleId === 0) {
        if (!link) continue
        const found = findArticleByLink.get(link)
        if (!found) continue
        articleId = found.id
      }
      if (existingBookmark.get(articleId)) continue
      insertBookmark.run(articleId)
      results.bookmarks++
    }
  } catch (err) {
    return res.status(500).json({ error: `Import failed: ${err.message}` })
  }

  res.json({ success: true, ...results })
})

module.exports = router