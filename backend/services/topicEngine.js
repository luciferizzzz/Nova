const { getTokens } = require('./eventEngine')

const DEFAULT_DAYS = 30
const DEFAULT_LIMIT = 12
const MIN_COUNT = 3
const TREND_RECENT_DAYS = 7
const MAX_HEADLINES = 3
const MAX_SOURCES = 5

// Kata umum khas judul berita yang bukan topik (pelengkap STOPWORDS milik
// eventEngine; dipisah supaya tidak mengubah perilaku clustering event).
const TOPIC_STOPWORDS = new Set(
  `
  jadi soal hingga usai kata ujar sebut dinilai disebut diduga sejumlah berbagai
  viral heboh bakal jelang pascal bikin cek kisah berhasil gagal diduga
  mengaku mengatakan menjelaskan menyebut menyatakan berikut akhirnya sementara
  diharapkan respons tanggapan terkait sebut tanpa makin kian jadi
  `.split(/\s+/).filter(Boolean)
)

function loadRecentArticles(db, days) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
  return db
    .prepare(
      `SELECT id, judul, slug, sumber, kategori, negara, bahasa, created_at
       FROM berita
       WHERE created_at >= ?
       ORDER BY created_at DESC`
    )
    .all(since)
}

function padDaily(map, days) {
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

function isNoise(term) {
  return /^\d+$/.test(term) || TOPIC_STOPWORDS.has(term)
}

// Topik diekstrak dari judul artikel dalam jendela waktu tertentu: frekuensi
// dokumen per token, keragaman sumber, tren 7-hari terakhir vs 7-hari sebelumnya,
// sparkline harian, dan headline perwakilan. Deterministik, tanpa model.
function extractTopics(db, { days = DEFAULT_DAYS, limit = DEFAULT_LIMIT, minCount = MIN_COUNT } = {}) {
  const articles = loadRecentArticles(db, days)
  const now = Date.now()
  const recentCut = now - TREND_RECENT_DAYS * 24 * 3600 * 1000
  const prevCut = now - 2 * TREND_RECENT_DAYS * 24 * 3600 * 1000

  const stats = new Map()
  for (const a of articles) {
    const tokens = new Set(getTokens(a.judul, a.bahasa))
    if (tokens.size === 0) continue
    const t = new Date(a.created_at).getTime()
    const dk = String(a.created_at || '').slice(0, 10)

    for (const term of tokens) {
      if (isNoise(term)) continue
      let s = stats.get(term)
      if (!s) {
        s = { term, count: 0, sources: new Set(), recent: 0, prev: 0, daily: new Map(), headlines: [] }
        stats.set(term, s)
      }
      s.count++
      s.sources.add(a.sumber)
      s.daily.set(dk, (s.daily.get(dk) || 0) + 1)
      if (t >= recentCut) s.recent++
      else if (t >= prevCut) s.prev++
      if (s.headlines.length < MAX_HEADLINES) {
        s.headlines.push({ id: a.id, judul: a.judul, slug: a.slug, sumber: a.sumber, created_at: a.created_at })
      }
    }
  }

  const topics = []
  for (const s of stats.values()) {
    if (s.count < minCount) continue
    topics.push({
      term: s.term,
      count: s.count,
      sources: s.sources.size,
      sourceList: [...s.sources].slice(0, MAX_SOURCES),
      recent: s.recent,
      prev: s.prev,
      trend: s.recent - s.prev,
      daily: padDaily(s.daily, days),
      headlines: s.headlines
    })
  }

  topics.sort(
    (a, b) => b.count - a.count || b.sources - a.sources || b.recent - a.recent || (a.term < b.term ? -1 : 1)
  )

  return { days, total: topics.length, articles: articles.length, topics: topics.slice(0, limit) }
}

module.exports = { extractTopics }
