const SEARCH_FIELDS = ['judul', 'konten', 'sumber', 'kategori', 'negara', 'bahasa']

function matchClause(value) {
  const like = `%${value}%`
  return {
    clause: `(${SEARCH_FIELDS.map((f) => `${f} LIKE ?`).join(' OR ')})`,
    params: SEARCH_FIELDS.map(() => like)
  }
}

function padDaily(rows, days) {
  const map = new Map(rows.map((r) => [r.day, r.count]))
  const out = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: map.get(key) || 0 })
  }
  return out
}

function getWatchlistInsights(db, item, { days = 7, latest = 8 } = {}) {
  const { clause, params } = matchClause(item.value)

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM berita WHERE ${clause}`)
    .get(...params).count

  const last24h = db
    .prepare(
      `SELECT COUNT(*) AS count FROM berita WHERE ${clause} AND datetime(created_at) >= datetime('now', '-1 day')`
    )
    .get(...params).count

  const prev24h = db
    .prepare(
      `SELECT COUNT(*) AS count FROM berita WHERE ${clause} AND datetime(created_at) >= datetime('now', '-2 days') AND datetime(created_at) < datetime('now', '-1 day')`
    )
    .get(...params).count

  const dailyRows = db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM berita
       WHERE ${clause} AND date(created_at) >= date('now', ?)
       GROUP BY day ORDER BY day ASC`
    )
    .all(...params, `-${Math.max(days - 1, 0)} days`)

  const topSources = db
    .prepare(
      `SELECT sumber, COUNT(*) AS count
       FROM berita WHERE ${clause}
       GROUP BY sumber ORDER BY count DESC LIMIT 5`
    )
    .all(...params)

  const articles = db
    .prepare(
      `SELECT id, judul, slug, sumber, kategori, negara, created_at
       FROM berita WHERE ${clause}
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(...params, latest)

  return {
    total,
    last24h,
    prev24h,
    trend: last24h - prev24h,
    daily: padDaily(dailyRows, days),
    topSources,
    latest: articles
  }
}

module.exports = { getWatchlistInsights, matchClause, SEARCH_FIELDS }
