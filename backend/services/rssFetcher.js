const RSSParser = require('rss-parser')
const { defaultSources } = require('./rssSources')
const { normalizeItem } = require('./newsNormalizer')

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'NOVA News Intelligence/0.1'
  }
})

function ensureDefaultSources(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM sources').get()
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO sources (name, rss_url, country, language, category, enabled, status)
      VALUES (?, ?, ?, ?, ?, 1, 'active')
    `)
    for (const s of defaultSources) {
      insert.run(s.name, s.rss_url, s.country, s.language, s.category)
    }
    console.log(`  ✓ Loaded ${defaultSources.length} default RSS sources`)
  }
}

function markSourceStatus(db, sourceId, status) {
  db.prepare('UPDATE sources SET status = ?, last_fetch = CURRENT_TIMESTAMP WHERE id = ?').run(status, sourceId)
}

async function fetchSingleSource(db, source) {
  try {
    let feed
    try {
      feed = await parser.parseURL(source.rss_url)
    } catch (err) {
      markSourceStatus(db, source.id, 'error')
      return { inserted: 0, total: 0, error: err.message }
    }

    const items = Array.isArray(feed.items) ? feed.items : []
    if (items.length === 0) {
      markSourceStatus(db, source.id, 'active')
      return { inserted: 0, total: 0 }
    }

    const selectByLink = db.prepare('SELECT id FROM berita WHERE link_asli = ?')
    const selectBySlug = db.prepare('SELECT id FROM berita WHERE slug = ?')
    const insertBerita = db.prepare(`
      INSERT INTO berita (judul, slug, konten, gambar, kategori, negara, bahasa, sumber, link_asli, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let inserted = 0
    let skipped = 0

    for (const item of items) {
      const n = normalizeItem(item, source)
      if (!n.link || n.link === '#' || selectByLink.get(n.link)) {
        skipped++
        continue
      }

      let slug = n.slug
      let suffix = 2
      while (selectBySlug.get(slug)) {
        slug = `${n.slug.slice(0, 110)}-${suffix}`
        suffix++
      }

      insertBerita.run(n.judul, slug, n.konten, n.gambar, n.kategori, n.negara, n.bahasa, n.sumber, n.link, n.created_at)
      inserted++
    }

    markSourceStatus(db, source.id, 'active')
    return { inserted, total: items.length, skipped }
  } catch (err) {
    markSourceStatus(db, source.id, 'error')
    return { inserted: 0, total: 0, error: err.message }
  }
}

async function fetchAllSources(db) {
  const sources = db.prepare('SELECT * FROM sources WHERE enabled = 1 ORDER BY id').all()
  const result = { total: 0, ok: 0, failed: 0, sources: [] }

  for (const source of sources) {
    const res = await fetchSingleSource(db, source)
    result.total += res.inserted
    if (res.error) {
      result.failed++
      console.log(`  ✗ ${source.name}: ${res.error}`)
    } else {
      result.ok++
      console.log(`  ✓ ${source.name}: ${res.inserted} new (${res.total} items)`)
    }
    result.sources.push({ id: source.id, name: source.name, ...res })
  }

  return result
}

module.exports = { fetchAllSources, fetchSingleSource, ensureDefaultSources, markSourceStatus }