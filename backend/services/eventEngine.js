const STOPWORDS = new Set(
  `
  about above after again against all also am an and any are aren't as at be because been before being below
  between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for
  from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself
  his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's like me more most mustn't my
  myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll
  she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they
  they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've
  were weren't what what's when when's where where's which while who who's whom why why's will with won't would
  wouldn't you you'd you'll you're you've your yours yourself yourselves news today latest update updates report
  reports says said told get make time new year day weeks hours minute video photo photos comment world
  dalam yang dan ini untuk dari tidak akan telah pada dengan adalah juga bahwa ada bisa ke atau sebagai lebih harus
  setelah sebelum namun tetapi karena menjadi dapat antara terhadap seperti sudah masih sekarang berada tanpa secara
  seperti serangkaian sedang mereka kita kamu
  `.split(/\s+/).filter(Boolean)
)

const EVENT_WINDOW_DAYS = 14
const MIN_ARTICLES_PER_EVENT = 2
const MIN_SHARED_TOKENS = 3
const MIN_JACCARD = 0.3
const MAX_EVENTS = 200
const MAX_PAIR_CAP = 60
const MAX_COMMON_FRACTION = 0.1
const MAX_DESC_HEADLINES = 6

function tokenizeLatin(text, minLen = 4) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= minLen && !STOPWORDS.has(w))
}

function tokenizeCJK(text) {
  const segments = String(text || '')
    .toLowerCase()
    .match(/[\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af]+/g) || []
  const tokens = []
  for (const seg of segments) {
    if (seg.length <= 2) {
      tokens.push(seg)
    } else {
      for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2))
    }
  }
  return tokens
}

function getTokens(text, language) {
  if (language === 'ja' || language === 'ko') return tokenizeCJK(text)
  return tokenizeLatin(text)
}

class UnionFind {
  constructor(size) {
    this.parent = new Array(size)
    for (let i = 0; i < size; i++) this.parent[i] = i
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }
  union(a, b) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
}

function loadArticles(db) {
  const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 24 * 3600 * 1000).toISOString()
  return db
    .prepare(
      `
      SELECT id, judul, kategori, negara, bahasa, created_at
      FROM berita
      WHERE created_at >= ?
      ORDER BY created_at ASC
    `
    )
    .all(since)
}

function detectEvents(db, opts = {}) {
  const articles = loadArticles(db)
  const clusters = clusterArticles(articles, opts)
  const records = buildEventRecords(articles, clusters)
  persistEvents(db, records)
  return { articles: articles.length, events: records.length }
}

function previewClusters(db, opts = {}) {
  const articles = loadArticles(db)
  const clusters = clusterArticles(articles, opts)
  const records = buildEventRecords(articles, clusters)
  return {
    articles: articles.length,
    events: records.length,
    top: records.slice(0, 10).map((r) => ({ size: r.members.length, category: r.category, title: r.title })),
    sizes: records.map((r) => r.members.length)
  }
}

function clusterArticles(articles, opts = {}) {
  const minSharedTokens = opts.minSharedTokens ?? MIN_SHARED_TOKENS
  const minJaccard = opts.minJaccard ?? MIN_JACCARD
  const maxCommonFraction = opts.maxCommonFraction ?? MAX_COMMON_FRACTION

  const n = articles.length
  if (n < MIN_ARTICLES_PER_EVENT) return []

  const tokenSets = new Array(n)
  const inverted = new Map()
  const freq = new Map()

  for (let i = 0; i < n; i++) {
    const tokens = new Set(getTokens(articles[i].judul, articles[i].bahasa))
    tokenSets[i] = tokens
    for (const t of tokens) {
      if (!inverted.has(t)) inverted.set(t, [])
      inverted.get(t).push(i)
      freq.set(t, (freq.get(t) || 0) + 1)
    }
  }

  const maxFreq = Math.max(2, Math.ceil(n * maxCommonFraction))
  const pairKey = (i, j) => (i < j ? i * n + j : j * n + i)
  const passPairs = []

  for (const [token, idxs] of inverted) {
    const f = freq.get(token)
    if (f < 2 || f > maxFreq) continue
    const list = idxs.length > MAX_PAIR_CAP ? idxs.slice(0, MAX_PAIR_CAP) : idxs
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        const A = tokenSets[a]
        const B = tokenSets[b]
        let shared = 0
        for (const t of A) {
          if (B.has(t)) shared++
        }
        if (shared < minSharedTokens) continue
        const union = A.size + B.size - shared
        if (union <= 0) continue
        const jaccard = shared / union
        if (jaccard >= minJaccard) passPairs.push(pairKey(a, b))
      }
    }
  }

  const uf = new UnionFind(n)
  for (const key of passPairs) {
    uf.union(Math.floor(key / n), key % n)
  }

  const groups = new Map()
  for (let i = 0; i < n; i++) {
    const root = uf.find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(i)
  }

  const clusters = []
  for (const members of groups.values()) {
    if (members.length >= MIN_ARTICLES_PER_EVENT) clusters.push(members)
  }

  clusters.sort((a, b) => b.length - a.length)
  return clusters.slice(0, MAX_EVENTS)
}

function buildEventRecords(articles, clusters) {
  const records = []
  for (const members of clusters) {
    const arts = members
      .map((i) => articles[i])
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

    const category = majorityBy(arts, 'kategori') || 'Other'
    const title = representativeTitle(arts)
    const desc = arts
      .slice(0, MAX_DESC_HEADLINES)
      .map((a) => truncate(a.judul, 140))
      .join('\n')

    records.push({
      title,
      description: desc,
      category,
      members: arts,
      createdAt: arts[0].created_at,
      updatedAt: arts[arts.length - 1].created_at
    })
  }
  return records
}

function majorityBy(articles, field) {
  const count = new Map()
  for (const a of articles) {
    const v = a[field] || ''
    count.set(v, (count.get(v) || 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [v, c] of count) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

function representativeTitle(articles) {
  const tokensByArticle = articles.map((a) => new Set(getTokens(a.judul, a.bahasa)))

  let best = 0
  let bestScore = -1
  for (let i = 0; i < articles.length; i++) {
    let score = 0
    for (let j = 0; j < articles.length; j++) {
      if (i === j) continue
      for (const t of tokensByArticle[i]) {
        if (tokensByArticle[j].has(t)) score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }

  return truncate(articles[best].judul, 200) || 'Untitled event'
}

function truncate(text, max) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max).replace(/\s+\S*$/, '')}…`
}

function persistEvents(db, records) {
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM event_articles')
    db.exec('DELETE FROM events')

    const insertEvent = db.prepare(
      `
      INSERT INTO events (title, description, category, latitude, longitude, created_at, updated_at)
      VALUES (?, ?, ?, NULL, NULL, ?, ?)
    `
    )
    const insertRel = db.prepare('INSERT INTO event_articles (event_id, article_id) VALUES (?, ?)')

    for (const r of records) {
      const res = insertEvent.run(r.title, r.description, r.category, r.createdAt, r.updatedAt)
      const eventId = Number(res.lastInsertRowid)
      for (const m of r.members) insertRel.run(eventId, m.id)
    }

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

module.exports = { detectEvents, previewClusters }