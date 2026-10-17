const { extractCategories } = require('./categoryEngine')

const DEFAULT_HOURS = 24
const MAX_HOURS = 24 * 30
const DEFAULT_DAYS = 30
const MAX_DAYS = 365
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 25

function parseHours(value) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_HOURS) : DEFAULT_HOURS
}

function parseDays(value) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_DAYS) : DEFAULT_DAYS
}

function parseLimit(value) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT
}

// Analytics Dashboard (Phase 8 — Analytics & Insights, Fitur D).
// Ringkasan read-only yang merangkum sub-fitur sebelumnya:
//   - Fitur A: cakupan corroboration lintas sumber ("also reported by")
//   - Fitur B: event dengan velocity tertinggi (laju artikel/jam)
//   - Fitur C: distribusi artikel per kategori
// Semua memakai tabel & service yang sudah ada (berita, events, event_articles,
// categoryEngine) — tanpa dependency/model baru, selaras dengan Phase 8.
function buildAnalyticsSummary(db, { hours, days, limit } = {}) {
  const h = parseHours(hours)
  const d = parseDays(days)
  const lim = parseLimit(limit)

  const count = (sql, ...params) => db.prepare(sql).get(...params).count

  const totals = {
    articles: count('SELECT COUNT(*) AS count FROM berita'),
    events: count('SELECT COUNT(*) AS count FROM events'),
    sources: count("SELECT COUNT(*) AS count FROM sources WHERE enabled = 1"),
    countries: count(
      "SELECT COUNT(DISTINCT negara) AS count FROM berita WHERE negara IS NOT NULL AND negara != ''"
    )
  }

  // Event yang anggotanya berasal dari >= 2 sumber berbeda (klaster terverifikasi
  // lintas outlet). Hanya artikel dengan `sumber` terisi yang dihitung.
  const corroboratedEvents = count(`
    SELECT COUNT(*) AS count FROM (
      SELECT ea.event_id
      FROM event_articles ea
      JOIN berita b ON b.id = ea.article_id
      WHERE b.sumber IS NOT NULL AND b.sumber != ''
      GROUP BY ea.event_id
      HAVING COUNT(DISTINCT b.sumber) >= 2
    )
  `)

  const corroboratedArticles = count(`
    SELECT COUNT(*) AS count FROM event_articles ea
    WHERE ea.event_id IN (
      SELECT ea2.event_id
      FROM event_articles ea2
      JOIN berita b2 ON b2.id = ea2.article_id
      WHERE b2.sumber IS NOT NULL AND b2.sumber != ''
      GROUP BY ea2.event_id
      HAVING COUNT(DISTINCT b2.sumber) >= 2
    )
  `)

  const coveragePct = totals.events
    ? Math.round((corroboratedEvents / totals.events) * 100)
    : 0

  const topCorroborated = db
    .prepare(
      `
      SELECT e.id, e.stable_id, e.title, e.category,
             COUNT(DISTINCT b.sumber) AS source_count,
             COUNT(b.id) AS article_count,
             MAX(b.created_at) AS last_at,
             (SELECT b2.slug FROM event_articles ea2
                JOIN berita b2 ON b2.id = ea2.article_id
                WHERE ea2.event_id = e.id
                ORDER BY b2.created_at DESC LIMIT 1) AS sample_slug
      FROM events e
      JOIN event_articles ea ON ea.event_id = e.id
      JOIN berita b ON b.id = ea.article_id
      WHERE b.sumber IS NOT NULL AND b.sumber != ''
      GROUP BY e.id
      HAVING COUNT(DISTINCT b.sumber) >= 2
      ORDER BY source_count DESC, article_count DESC, last_at DESC
      LIMIT ?
    `
    )
    .all(lim)

  // Velocity: laju artikel baru per jam pada klaster event dalam jendela `hours`.
  const since = new Date(Date.now() - h * 3600 * 1000).toISOString()
  const trending = db
    .prepare(
      `
      SELECT e.id, e.stable_id, e.title, e.category,
             COUNT(b.id) AS recent_count,
             COUNT(DISTINCT b.sumber) AS source_count,
             (SELECT COUNT(*) FROM event_articles ea2 WHERE ea2.event_id = e.id) AS total_count,
             MAX(b.created_at) AS last_at
      FROM events e
      JOIN event_articles ea ON ea.event_id = e.id
      JOIN berita b ON b.id = ea.article_id
      WHERE b.created_at >= ?
      GROUP BY e.id
      HAVING COUNT(b.id) > 0
      ORDER BY recent_count DESC, last_at DESC
      LIMIT ?
    `
    )
    .all(since, lim)

  for (const ev of trending) {
    ev.velocity = Number((ev.recent_count / h).toFixed(2))
  }

  const cat = extractCategories(db, { days: d, limit: lim })

  return {
    window: { hours: h, days: d, since },
    totals,
    corroboration: {
      events: corroboratedEvents,
      articles: corroboratedArticles,
      coveragePct,
      top: topCorroborated
    },
    trending,
    categories: {
      total: cat.total,
      articles: cat.articles,
      items: cat.categories.map((c) => ({
        kategori: c.kategori,
        count: c.count,
        sources: c.sources,
        countries: c.countries,
        trend: c.trend
      }))
    }
  }
}

module.exports = { buildAnalyticsSummary, DEFAULT_HOURS, DEFAULT_DAYS, DEFAULT_LIMIT }
