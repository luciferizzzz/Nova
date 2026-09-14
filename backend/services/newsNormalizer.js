function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120)
}

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractImage(html) {
  const match = String(html || '').match(/<img[^>]+src=["']?([^"'\s>]+)/i)
  return match ? match[1].replace(/&amp;/g, '&') : ''
}

function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeItem(item, source) {
  const judul = stripTags(item.title) || 'Untitled'
  const link = String(item.link || '').trim()
  const konten = stripTags(item.contentSnippet || item.content || item.summary || '')
  const gambar =
    item.enclosure?.url ||
    item['media:content']?.url ||
    item['media:content']?.$?.url ||
    item['media:thumbnail']?.url ||
    item['media:thumbnail']?.$?.url ||
    extractImage(item.content || '') ||
    ''
  const slug = slugify(judul) || 'artikel'
  const created_at = toIsoDate(item.isoDate || item.pubDate) || toIsoDate(item.created) || new Date().toISOString()

  return {
    judul,
    link,
    konten,
    gambar,
    kategori: source.category || 'Other',
    negara: source.country || 'Indonesia',
    bahasa: source.language || 'id',
    sumber: source.name,
    slug,
    created_at
  }
}

module.exports = { slugify, stripTags, extractImage, toIsoDate, normalizeItem }